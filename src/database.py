import hashlib
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import time
from dotenv import load_dotenv
from psycopg2.pool import ThreadedConnectionPool

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

# 1. Thread-safe Connection Pool initialization
# minconn=1, maxconn=20 is recommended for youth coach app scale on Supabase
try:
    connection_pool = ThreadedConnectionPool(
        minconn=1,
        maxconn=20,
        dsn=DATABASE_URL,
        cursor_factory=RealDictCursor
    )
    print("Database connection pool initialized successfully (min=1, max=20).")
except Exception as e:
    print(f"Warning: Failed to initialize database connection pool: {e}")
    connection_pool = None
# 2. Proxy wrapper class to intercept connection closes and return them to the pool
class PooledConnectionWrapper:
    def __init__(self, conn, pool):
        self._conn = conn
        self._pool = pool
    def __getattr__(self, name):
        # Forward all attributes and query method calls to the underlying psycopg2 connection
        return getattr(self._conn, name)
    def __enter__(self):
        self._conn.__enter__()
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._conn.__exit__(exc_type, exc_val, exc_tb)
    def close(self):
        # Intercept close call: put connection back into pool instead of closing socket
        if self._pool and self._conn:
            try:
                self._pool.putconn(self._conn)
            except Exception as e:
                print(f"Error returning connection to pool: {e}")
            self._conn = None
            self._pool = None
        elif self._conn:
            # Fallback direct connection: close it physically
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
# 3. Updated get_db_connection() helper
def get_db_connection():
    """Retrieves a pooled database connection wrapped in a proxy wrapper."""
    if connection_pool:
        try:
            conn = connection_pool.getconn()
            return PooledConnectionWrapper(conn, connection_pool)
        except Exception as e:
            print(f"Connection pool exhausted or error: {e}. Falling back to direct connection.")
    
    # Fallback to creating a direct physical connection if the pool fails/exhausts
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    """Creates the coaches table automatically if it does not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS coaches (
                   id SERIAL PRIMARY KEY,
                   username TEXT UNIQUE NOT NULL,
                   password_hash TEXT NOT NULL,
                   coach_name TEXT NOT NULL,
                   location TEXT NOT NULL,
                   primary_age_group TEXT NOT NULL
                   )
                   ''')
    """Alter players table to add eligible_positions and create lineups table if it does not exist."""
    cursor.execute("""
                   ALTER TABLE players 
                   ADD COLUMN IF NOT EXISTS eligible_positions VARCHAR(255) DEFAULT 'P,C,1B,2B,SS,3B,LF,CF,RF';
                   """)
    
    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lineups (
                   id serial primary key,
                   team_id INTEGER REFERENCES team(id) ON DELETE CASCADE,
                   game_date DATE NOT NULL,
                   opponent VARCHAR(100) NOT NULL,
                   innings_count INTEGER NOT NULL,
                   lineup_data JSONB NOT NULL,
                   created_by_coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )
                   """)
    
    cursor.execute("""
                   ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
                   """)

    conn.commit()
    conn.close()

def hash_password(password):
    """Converts plain-text passwords into a secure SH-256 hash string."""
    return hashlib.sha256(password.encode()).hexdigest()

def register_coach(username, password, coach_name, location, age_group):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pwd_hash = hash_password(password)
        cursor.execute(
            """
            INSERT INTO coaches (username, password_hash, coach_name, location, primary_age_group)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (username.lower().strip(), pwd_hash, coach_name.strip(), location.strip(), age_group)
        )
        conn.commit()
        return True
    except psycopg2.IntegrityError:
        return False
    finally:
        cursor.close()
        conn.close()
                    
def authenticate_coach(username, password):
    """Validates credentials against hashed database entries in Supabase."""
    conn = get_db_connection()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    cursor.execute('''
        SELECT id, username, coach_name, location, primary_age_group
        FROM coaches
        WHERE username = %s AND password_hash = %s
        ''', (username.lower().strip(), pwd_hash))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return {
            "id": row["id"], 
            "username": row["username"],
            "coach_name": row["coach_name"],
            "location": row["location"],
            "age_group": row["primary_age_group"]
        }
    return None

def get_coach_by_email(email: str):
    """Retrieves a coach's profile details by their email/username address."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, username, coach_name, location, primary_age_group
            FROM coaches
            WHERE username = %s
            """,
            (email.lower().strip(),)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        cursor.close()
        conn.close()

def is_valid_email(email):
    """Checks if th euser name matches a standard email format."""
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(email_regex, email.strip()) is not None

def validate_password_strength(password):
    """Validates password complexity requirements.
    Returns (True, "Success") or (False, "Error message detailing what failed")."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if " " in password or "\t" in password or "\n" in password:
        return False, "Password cannot contain spaces or whitespaces."
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter."
    
    # Checking against specific allowed special characer list: ! @ # $ % ^ & *
    special_chars = "!@#$%^&*"
    if not any(char in special_chars for char in password):
        return False, "Password must contain at least one of these special characters: ! @ # $ % ^ & *"
    
    return True, "Password meets all strength requirements."

def create_team(coach_id: int, team_name: str, season: str, age_group: str, innings_per_game: int = 7):
    """Creates a new team and registers the creator as the Head Coach."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Insert team
        cursor.execute(
            """
            INSERT INTO teams (team_name, season, age_group, innings_per_game)
            VALUES (%s, %s, %s, %s)
            RETURNING id, team_name, season, age_group, wins, losses, ties, innings_per_game;
            """,
            (team_name.strip(), season.strip(), age_group, innings_per_game)
        )
        new_team = cursor.fetchone()
        team_id = new_team["id"]

        # 2. Automatically make this coach the Head Coach and set it to active
        cursor.execute(
            """
            INSERT INTO team_coaches (team_id, coach_id, role, is_active)
            VALUES (%s, %s, 'Head Coach', true)
            ON CONFLICT (team_id, coach_id) DO UPDATE SET is_active = true;
            """,
            (team_id, coach_id)
        )
        
        # De-activate all other teams for this coach
        cursor.execute(
            "UPDATE team_coaches SET is_active = false WHERE coach_id = %s AND team_id != %s", 
            (coach_id, team_id)
        )
        
        conn.commit()
        team_dict = dict(new_team)
        team_dict["role"] = "Head Coach"
        team_dict["is_active"] = True
        return team_dict
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_coach_teams(coach_id: int):
    """Retrieves all teams associated with a specific coach, along with their role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT t.id, t.team_name, t.season, t.age_group, t.wins, t.losses, t.ties, t.innings_per_game,
                   tc.role, tc.is_active
            FROM teams t
            JOIN team_coaches tc ON t.id = tc.team_id
            WHERE tc.coach_id = %s
            ORDER BY tc.created_at DESC;
            """,
            (coach_id,)
        )
        teams = cursor.fetchall()
        return [dict(team) for team in teams]
    finally:
        cursor.close()
        conn.close()

def set_active_team(coach_id: int, team_id: int):
    """Sets a specific team as active for this coach and deactivates others."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. De-activate all teams for this coach in join table
        cursor.execute(
            "UPDATE team_coaches SET is_active = false WHERE coach_id = %s", (coach_id,)
        )
        # 2. Activate the selected team
        cursor.execute(
            """
            UPDATE team_coaches 
            SET is_active = true 
            WHERE coach_id = %s AND team_id = %s
            RETURNING team_id;
            """,
            (coach_id, team_id)
        )
        cursor.fetchone()
        conn.commit()
        
        # Return updated team list
        return get_coach_teams(coach_id)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def update_team(coach_id: int, team_id: int, team_name: str, season: str, wins: int, losses: int, ties: int, age_group: str, is_active: bool, innings_per_game: int = 7):
    """Updates team parameters. Refuses if the user is not a Head Coach."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can edit this team.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE teams
            SET team_name = %s, season = %s, wins = %s, losses = %s, ties = %s, age_group = %s, innings_per_game = %s
            WHERE id = %s
            RETURNING *;
            """,
            (team_name.strip(), season.strip(), wins, losses, ties, age_group, innings_per_game, team_id)
        )
        row = cursor.fetchone()
        
        # Update active state in join table
        cursor.execute(
            "UPDATE team_coaches SET is_active = %s WHERE coach_id = %s AND team_id = %s",
            (is_active, coach_id, team_id)
        )
        
        conn.commit()
        return dict(row) if row else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def add_fractional_innings(val1: float, val2: float) -> float:
    """Correctly adds two softball fractional innings values.
    Example: 4.2 + 2.1 = 7.0 and not 6.3 (4 full innings and 2 outs + 2 full innings and 1 out = 7 full innings)
    """
    def to_outs(val: float) -> int:
        whole = int(val)
        fraction = round(val - whole, 1)
        outs = whole * 3
        if fraction == 0.1:
            outs += 1
        elif fraction == 0.2:
            outs += 2
        return outs

    total_outs = to_outs(val1) + to_outs(val2)
    whole_innings = total_outs // 3
    remaining_outs = total_outs % 3

    if remaining_outs == 0:
        return float(whole_innings)
    elif remaining_outs == 1:
        return whole_innings + 0.1
    elif remaining_outs == 2:
        return whole_innings + 0.2
    return 0.0

def convert_ip_to_actual(ip: float) -> float:
    """Converts scoring notation (ex: 4.1, 4.2) to actual decimal innings (ex: 4.333, 4.667)."""
    whole = int(ip)
    fraction = round(ip - whole, 1)
    if fraction == 0.1:
        return whole + 0.333
    elif fraction == 0.2:
        return whole + 0.667
    return float(whole)

def calculate_derived_pitching_stats(stats: dict, innings_per_game: int = 7):
    """Calculates ERA, WHIP, K/7, BB/7, pitches per inning, and K/BB ratio based on 7-inning game."""
    ip = float(stats.get("innings_pitched", 0.0))
    er = stats.get("earned_runs", 0)
    bb = stats.get("walks_allowed", 0)
    hits = stats.get("hits_allowed", 0)
    so = stats.get("strikeouts_thrown", 0)
    pitches = stats.get("number_of_pitches", 0)

    # 1. Convert innings pitches to actual float value using helper (converting fractions to decimals)
    actual_ip = convert_ip_to_actual(ip)

    # 2. Calculate ERA, WHIP, K/7, BB/7, and Pitches/Inning
    if actual_ip > 0:
        era = (er * innings_per_game) / actual_ip
        whip = (bb + hits) / actual_ip
        k7 = (so * innings_per_game) / actual_ip
        bb7 = (bb * innings_per_game) / actual_ip
        pitches_per_inning = pitches / actual_ip
    else:
        era = 0.0
        whip = 0.0
        k7 = 0.0
        bb7 = 0.0
        pitches_per_inning = 0.0

    # 3. Calculate strikeout to walk ratio
    k_bb_ratio = so / bb if bb > 0 else float(so)

    result = dict(stats)
    result["era"] = round(era, 2)
    result["whip"] = round(whip, 2)
    result["k7"] = round(k7, 2)
    result["bb7"] = round(bb7, 2)
    result["pitches_per_inning"] = round(pitches_per_inning, 1)
    result["k_bb_ratio"] = round(k_bb_ratio, 1)
    return result

def calculate_derived_defensive_stats(stats: dict):
    """Calculates fielding percentage and caught stealing percentages for catcher."""
    tc = stats.get("total_chances", 0)
    po = stats.get("putouts", 0)
    ast = stats.get("assists", 0)

    # Fielding Percentage = (PO + A) / TC
    fielding_pct = (po + ast) / tc if tc > 0 else 0.0

    # Catcher Caught Stealing Percentage = CS / (SB + CS)
    sb = stats.get("runners_stolen_bases", 0)
    cs = stats.get("runners_caught_stealing", 0)
    attempts = sb + cs
    cs_pct = cs / attempts if attempts > 0 else 0.0

    result = dict(stats)
    result["fielding_percentage"] = round(fielding_pct, 3)
    result["caught_stealing_percentage"] = round(cs_pct, 3)
    return result

def calculate_derived_stats(player: dict):
    """Calculates htis, batting average, and on base percentage dynamically from raw stats."""
    # 1. Calculate hits
    singles = player.get("singles", 0)
    doubles = player.get("doubles", 0)
    triples = player.get("triples", 0)
    home_runs = player.get("home_runs", 0)
    hits = singles + doubles + triples + home_runs

    # 2. Calculate batting average (hits/at-bats)
    ab = player.get("at_bats", 0)
    avg = hits / ab if ab > 0 else 0.0

    # 3. Calculate on base percentage ((hits + walks + hbp) / plate appearances)
    bb = player.get("walks", 0)
    hbp = player.get("hit_by_pitches", 0)
    pa = player.get("plate_appearances", 0)
    obp = (hits + bb + hbp) / pa if pa > 0 else 0.0

    # 4. Calculate slugging percentage
    slg = (singles + 2 * doubles + 3 * triples + 4 * home_runs) / ab if ab > 0 else 0.0

    # 5. Calculate on base plus slugging
    ops = obp + slg

    # 6. Calculate isloated power
    iso = slg - avg

    # 7. Calculate walk-to-strikeout ratio
    k = player.get("strikeouts", 0)
    bb_k = bb / k if k > 0 else float(bb)

    # 8. Calculate stolen base success rate (stolen base percentage)
    sb = player.get("stolen_bases", 0)
    cs = player.get("caught_stealing", 0)
    attempts = sb + cs
    sb_pct = sb / attempts if attempts > 0 else 0.0

    # Return copies of the dict containing calculated fields
    result = dict(player)
    result["hits"] = hits
    result["batting_average"] = round(avg, 3)
    result["on_base_percentage"] = round(obp, 3)
    result["slugging_percentage"] = round(slg, 3)
    result["ops"] = round(ops, 3)
    result["isolated_power"] = round(iso, 3)
    result["bb_k_ratio"] = round(bb_k, 2)
    result["stolen_base_percentage"] = round(sb_pct, 3)

    
    # Chain pitching and defensive derivations together
    pitching_stats = calculate_derived_pitching_stats(result, result.get("innings_per_game", 7))
    return calculate_derived_defensive_stats(pitching_stats)

def add_player(coach_id: int, team_id: int, name: str, number: int, batting_hand: str, throwing_hand: str, parent_player_id: int = None):
    """Creates a new player on a team with corresponding empty stats rows."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can add players.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Insert core player info
        cursor.execute(
            """
            INSERT INTO players (team_id, player_name, player_number, batting_hand, throwing_hand, parent_player_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (team_id, name.strip(), number, batting_hand, throwing_hand, parent_player_id)
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None
            
        player_id = player_row["id"]
        
        # 2. Insert stats rows for all categories
        cursor.execute("INSERT INTO offensive_stats (player_id, team_id) VALUES (%s, %s) RETURNING *;", (player_id, team_id))
        off_row = cursor.fetchone()
        
        cursor.execute("INSERT INTO pitching_stats (player_id, team_id) VALUES (%s, %s) RETURNING *;", (player_id, team_id))
        pit_row = cursor.fetchone()

        cursor.execute("INSERT INTO defensive_stats (player_id, team_id) VALUES (%s, %s) RETURNING *;", (player_id, team_id))
        def_row = cursor.fetchone()

        cursor.execute("INSERT INTO catching_stats (player_id, team_id) VALUES (%s, %s) RETURNING *;", (player_id, team_id))
        cat_row = cursor.fetchone()
        
        conn.commit()

        # Fetch team innings_per_game
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (team_id,))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7
        
        full_player = {
            **dict(off_row),
            **dict(pit_row),
            **dict(def_row),
            **dict(cat_row),
            **dict(player_row),
            "innings_per_game": innings_per_game
        }
        return calculate_derived_stats(full_player)
    finally:
        cursor.close()
        conn.close()

def get_team_players(team_id: int):
    """Retrieves all players on a team by left-joining players and stats."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 
                p.id, p.team_id, p.player_name, p.player_number, p.batting_hand, p.throwing_hand, p.games_played, p.parent_player_id, p.created_at, p.updated_at,
                COALESCE(t.innings_per_game, 7) as innings_per_game,
                COALESCE(o.plate_appearances, 0) as plate_appearances,
                COALESCE(o.at_bats, 0) as at_bats,
                COALESCE(o.singles, 0) as singles,
                COALESCE(o.doubles, 0) as doubles,
                COALESCE(o.triples, 0) as triples,
                COALESCE(o.home_runs, 0) as home_runs,
                COALESCE(o.walks, 0) as walks,
                COALESCE(o.strikeouts, 0) as strikeouts,
                COALESCE(o.hit_by_pitches, 0) as hit_by_pitches,
                COALESCE(o.stolen_bases, 0) as stolen_bases,
                COALESCE(o.caught_stealing, 0) as caught_stealing,
                COALESCE(o.runs_scored, 0) as runs_scored,
                COALESCE(o.runs_batted_in, 0) as runs_batted_in,
                COALESCE(p_stats.games_pitched, 0) as games_pitched,
                COALESCE(p_stats.games_started, 0) as games_started,
                COALESCE(p_stats.innings_pitched, 0.0) as innings_pitched,
                COALESCE(p_stats.batters_faced, 0) as batters_faced,
                COALESCE(p_stats.number_of_pitches, 0) as number_of_pitches,
                COALESCE(p_stats.hits, 0) as hits_allowed,
                COALESCE(p_stats.runs, 0) as runs_allowed,
                COALESCE(p_stats.earned_runs, 0) as earned_runs,
                COALESCE(p_stats.walks, 0) as walks_allowed,
                COALESCE(p_stats.strikeouts, 0) as strikeouts_thrown,
                COALESCE(p_stats.hit_by_pitches, 0) as hit_by_pitches_allowed,
                COALESCE(p_stats.left_on_base, 0) as left_on_base,
                COALESCE(d.total_chances, 0) as total_chances,
                COALESCE(d.assists, 0) as assists,
                COALESCE(d.putouts, 0) as putouts,
                COALESCE(d.errors, 0) as errors,
                COALESCE(c.innings_caught, 0.0) as innings_caught,
                COALESCE(c.passed_balls_allowed, 0) as passed_balls_allowed,
                COALESCE(c.runners_stolen_bases, 0) as runners_stolen_bases,
                COALESCE(c.runners_caught_stealing, 0) as runners_caught_stealing,
                COALESCE(d.innings_p, 0.0) as innings_p,
                COALESCE(d.innings_c, 0.0) as innings_c,
                COALESCE(d.innings_1b, 0.0) as innings_1b,
                COALESCE(d.innings_2b, 0.0) as innings_2b,
                COALESCE(d.innings_3b, 0.0) as innings_3b,
                COALESCE(d.innings_ss, 0.0) as innings_ss,
                COALESCE(d.innings_lf, 0.0) as innings_lf,
                COALESCE(d.innings_cf, 0.0) as innings_cf,
                COALESCE(d.innings_rf, 0.0) as innings_rf
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN offensive_stats o ON p.id = o.player_id
            LEFT JOIN pitching_stats p_stats ON p.id = p_stats.player_id
            LEFT JOIN defensive_stats d ON p.id = d.player_id
            LEFT JOIN catching_stats c ON p.id = c.player_id
            WHERE p.team_id = %s
            ORDER BY p.player_name ASC;
            """,
            (team_id,)
        )
        rows = cursor.fetchall()
        return [calculate_derived_stats(row) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_player_stats(coach_id: int, player_id: int, stats: dict):
    """Updates core details in players and stats inside transaction."""
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()

    cursor.execute("SELECT team_id FROM players WHERE id = %s LIMIT 1;", (player_id,))
    row = cursor.fetchone()
    if not row:
        return None
    team_id = row["team_id"]

    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can edit player stats.")
    
    try:
        parent_id = stats.get("parent_player_id")

        # Update players table
        cursor.execute(
            """
            UPDATE players
            SET player_name = %s, player_number = %s, batting_hand = %s, throwing_hand = %s, games_played = %s, parent_player_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
            """,
            (
                stats["player_name"].strip(), stats["player_number"], stats["batting_hand"], stats["throwing_hand"],
                stats["games_played"], parent_id, player_id
            )
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None

        # Update offensive_stats (INSERT OR UPDATE)
        cursor.execute(
            """
            INSERT INTO offensive_stats (
                player_id, team_id, plate_appearances, at_bats,
                singles, doubles, triples, home_runs,
                walks, strikeouts, hit_by_pitches,
                stolen_bases, caught_stealing,
                runs_scored, runs_batted_in, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id) DO UPDATE
            SET plate_appearances = EXCLUDED.plate_appearances, at_bats = EXCLUDED.at_bats,
                singles = EXCLUDED.singles, doubles = EXCLUDED.doubles, triples = EXCLUDED.triples, home_runs = EXCLUDED.home_runs,
                walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts, hit_by_pitches = EXCLUDED.hit_by_pitches,
                stolen_bases = EXCLUDED.stolen_bases, caught_stealing = EXCLUDED.caught_stealing,
                runs_scored = EXCLUDED.runs_scored, runs_batted_in = EXCLUDED.runs_batted_in, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, player_row["team_id"], stats["plate_appearances"], stats["at_bats"],
                stats["singles"], stats["doubles"], stats["triples"], stats["home_runs"],
                stats["walks"], stats["strikeouts"], stats["hit_by_pitches"],
                stats["stolen_bases"], stats["caught_stealing"],
                stats["runs_scored"], stats["runs_batted_in"]
            )
        )
        stats_row = cursor.fetchone()

        # Update pitching_stats
        cursor.execute(
            """
            INSERT INTO pitching_stats (
                player_id, team_id, games_pitched, games_started,
                innings_pitched, batters_faced, number_of_pitches,
                hits, runs, earned_runs, walks, strikeouts,
                hit_by_pitches, left_on_base, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id) DO UPDATE
            SET games_pitched = EXCLUDED.games_pitched, games_started = EXCLUDED.games_started,
                innings_pitched = EXCLUDED.innings_pitched, batters_faced = EXCLUDED.batters_faced,
                number_of_pitches = EXCLUDED.number_of_pitches, hits = EXCLUDED.hits, runs = EXCLUDED.runs,
                earned_runs = EXCLUDED.earned_runs, walks = EXCLUDED.walks, strikeouts = EXCLUDED.strikeouts,
                hit_by_pitches = EXCLUDED.hit_by_pitches, left_on_base = EXCLUDED.left_on_base, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, player_row["team_id"], stats.get("games_pitched", 0), stats.get("games_started", 0),
                stats.get("innings_pitched", 0.0), stats.get("batters_faced", 0), stats.get("number_of_pitches", 0),
                stats.get("hits_allowed", 0), stats.get("runs_allowed", 0), stats.get("earned_runs", 0),
                stats.get("walks_allowed", 0), stats.get("strikeouts_thrown", 0), stats.get("hit_by_pitches_allowed", 0),
                stats.get("left_on_base", 0)
            )
        )
        pit_row = cursor.fetchone()

        # Update defensive_stats
        cursor.execute(
            """
            INSERT INTO defensive_stats (
                player_id, team_id, total_chances, assists, putouts, errors,
                innings_p, innings_c, innings_1b, innings_2b, innings_3b, innings_ss, innings_lf, innings_cf, innings_rf, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id) DO UPDATE
            SET total_chances = EXCLUDED.total_chances, assists = EXCLUDED.assists,
                putouts = EXCLUDED.putouts, errors = EXCLUDED.errors,
                innings_p = EXCLUDED.innings_p, innings_c = EXCLUDED.innings_c,
                innings_1b = EXCLUDED.innings_1b, innings_2b = EXCLUDED.innings_2b,
                innings_3b = EXCLUDED.innings_3b, innings_ss = EXCLUDED.innings_ss,
                innings_lf = EXCLUDED.innings_lf, innings_cf = EXCLUDED.innings_cf,
                innings_rf = EXCLUDED.innings_rf, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, player_row["team_id"], stats.get("total_chances", 0), stats.get("assists", 0),
                stats.get("putouts", 0), stats.get("errors", 0),
                stats.get("innings_p", 0.0), stats.get("innings_c", 0.0), stats.get("innings_1b", 0.0),
                stats.get("innings_2b", 0.0), stats.get("innings_3b", 0.0), stats.get("innings_ss", 0.0),
                stats.get("innings_lf", 0.0), stats.get("innings_cf", 0.0), stats.get("innings_rf", 0.0)
            )
        )
        def_row = cursor.fetchone()

        # Update catching_stats
        cursor.execute(
            """
            INSERT INTO catching_stats (
                player_id, team_id, innings_caught, passed_balls_allowed, runners_stolen_bases, runners_caught_stealing, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (player_id) DO UPDATE
            SET innings_caught = EXCLUDED.innings_caught, passed_balls_allowed = EXCLUDED.passed_balls_allowed,
                runners_stolen_bases = EXCLUDED.runners_stolen_bases, runners_caught_stealing = EXCLUDED.runners_caught_stealing,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
            """,
            (
                player_id, player_row["team_id"], stats.get("innings_caught", 0.0), stats.get("passed_balls_allowed", 0),
                stats.get("runners_stolen_bases", 0), stats.get("runners_caught_stealing", 0)
            )
        )
        cat_row = cursor.fetchone()

        conn.commit()

        # Fetch team innings_per_game
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (player_row["team_id"],))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7

        full_player = {
            **dict(stats_row),
            **dict(player_row),
            "games_pitched": pit_row["games_pitched"],
            "games_started": pit_row["games_started"],
            "innings_pitched": float(pit_row["innings_pitched"]),
            "batters_faced": pit_row["batters_faced"],
            "number_of_pitches": pit_row["number_of_pitches"],
            "hits_allowed": pit_row["hits"],
            "runs_allowed": pit_row["runs"],
            "earned_runs": pit_row["earned_runs"],
            "walks_allowed": pit_row["walks"],
            "strikeouts_thrown": pit_row["strikeouts"],
            "hit_by_pitches_allowed": pit_row["hit_by_pitches"],
            "left_on_base": pit_row["left_on_base"],
            "total_chances": def_row["total_chances"],
            "assists": def_row["assists"],
            "putouts": def_row["putouts"],
            "errors": def_row["errors"],
            "innings_p": float(def_row["innings_p"] or 0.0),
            "innings_c": float(def_row["innings_c"] or 0.0),
            "innings_1b": float(def_row["innings_1b"] or 0.0),
            "innings_2b": float(def_row["innings_2b"] or 0.0),
            "innings_3b": float(def_row["innings_3b"] or 0.0),
            "innings_ss": float(def_row["innings_ss"] or 0.0),
            "innings_lf": float(def_row["innings_lf"] or 0.0),
            "innings_cf": float(def_row["innings_cf"] or 0.0),
            "innings_rf": float(def_row["innings_rf"] or 0.0),
            "innings_caught": float(cat_row["innings_caught"]),
            "passed_balls_allowed": cat_row["passed_balls_allowed"],
            "runners_stolen_bases": cat_row["runners_stolen_bases"],
            "runners_caught_stealing": cat_row["runners_caught_stealing"],
            "innings_per_game": innings_per_game
        }
        return calculate_derived_stats(full_player)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def delete_player(coach_id: int, player_id: int):
    # Fetch team_id for this player
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT team_id FROM players WHERE id = %s LIMIT 1;", (player_id,))
    row = cursor.fetchone()
    if not row:
        return False
    team_id = row["team_id"]
    
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can delete players.")
        
    try:
        cursor.execute("DELETE FROM players WHERE id = %s RETURNING id;", (player_id,))
        ret_row = cursor.fetchone()
        conn.commit()
        return ret_row is not None
    finally:
        cursor.close()
        conn.close()

def bulk_update_player_stats(coach_id: int, team_id: int, updates: list):
    """Updates multiple players stats inside a split-table players structure."""
    if not check_is_head_coach(coach_id, team_id):
        raise PermissionError("Only a Head Coach can import bulk stats.")
    
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        # Fetch the team's innings_per_game to pass to the derived stats
        cursor.execute("SELECT innings_per_game FROM teams WHERE id = %s;", (team_id,))
        team_row = cursor.fetchone()
        innings_per_game = team_row["innings_per_game"] if team_row else 7

        updated_players = []
        for p in updates:
            number = p.get("player_number")
            name = p.get("player_name", "").strip()
            
            # Find player row by jersey number (if specified) or name
            if number >= 0:
                cursor.execute(
                    "SELECT id, games_played FROM players WHERE team_id = %s AND player_number = %s LIMIT 1;",
                    (team_id, number)
                )
            else:
                cursor.execute(
                    "SELECT id, games_played FROM players WHERE team_id = %s AND LOWER(player_name) = LOWER(%s) LIMIT 1;",
                    (team_id, name)
                )
            row = cursor.fetchone()
            if not row:
                continue
                
            player_id = row["id"]
            games_played = p.get("games_played", row["games_played"])

            # Update players table
            cursor.execute(
                "UPDATE players SET games_played = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;",
                (games_played, player_id)
            )
            player_row = cursor.fetchone()

            # Update offensive stats
            cursor.execute(
                """
                INSERT INTO offensive_stats (
                    player_id, team_id, plate_appearances, at_bats,
                    singles, doubles, triples, home_runs,
                    walks, strikeouts, hit_by_pitches,
                    stolen_bases, caught_stealing,
                    runs_scored, runs_batted_in, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id) DO UPDATE
                SET plate_appearances = EXCLUDED.plate_appearances,
                    at_bats = EXCLUDED.at_bats,
                    singles = EXCLUDED.singles,
                    doubles = EXCLUDED.doubles,
                    triples = EXCLUDED.triples,
                    home_runs = EXCLUDED.home_runs,
                    walks = EXCLUDED.walks,
                    strikeouts = EXCLUDED.strikeouts,
                    hit_by_pitches = EXCLUDED.hit_by_pitches,
                    stolen_bases = EXCLUDED.stolen_bases,
                    caught_stealing = EXCLUDED.caught_stealing,
                    runs_scored = EXCLUDED.runs_scored,
                    runs_batted_in = EXCLUDED.runs_batted_in,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p["plate_appearances"], p["at_bats"],
                    p["singles"], p["doubles"], p["triples"], p["home_runs"],
                    p["walks"], p["strikeouts"], p["hit_by_pitches"],
                    p["stolen_bases"], p["caught_stealing"],
                    p["runs_scored"], p["runs_batted_in"]
                )
            )
            stats_row = cursor.fetchone()

            # Update pitching stats table (only if games_pitched > 0)
            if p.get("games_pitched", 0) > 0:
                cursor.execute(
                    """
                    INSERT INTO pitching_stats (
                        player_id, team_id, games_pitched, games_started,
                        innings_pitched, batters_faced, number_of_pitches,
                        hits, runs, earned_runs, walks, strikeouts,
                        hit_by_pitches, left_on_base, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (player_id) DO UPDATE
                    SET games_pitched = EXCLUDED.games_pitched,
                        games_started = EXCLUDED.games_started,
                        innings_pitched = EXCLUDED.innings_pitched,
                        batters_faced = EXCLUDED.batters_faced,
                        number_of_pitches = EXCLUDED.number_of_pitches,
                        hits = EXCLUDED.hits,
                        runs = EXCLUDED.runs,
                        earned_runs = EXCLUDED.earned_runs,
                        walks = EXCLUDED.walks,
                        strikeouts = EXCLUDED.strikeouts,
                        hit_by_pitches = EXCLUDED.hit_by_pitches,
                        left_on_base = EXCLUDED.left_on_base,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *;
                    """,
                    (
                        player_id, team_id, p["games_pitched"], p["games_started"],
                        p["innings_pitched"], p["batters_faced"], p["number_of_pitches"],
                        p["hits_allowed"], p["runs_allowed"], p["earned_runs"], p["walks_allowed"], p["strikeouts_thrown"],
                        p["hit_by_pitches_allowed"], p["left_on_base"]
                    )
                )
                pit_row = cursor.fetchone()
            else:
                # Retrieve existing pitching stats if they exist
                cursor.execute("SELECT * FROM pitching_stats WHERE player_id = %s LIMIT 1;", (player_id,))
                pit_row = cursor.fetchone()
                if not pit_row:
                    pit_row = {
                        "games_pitched": 0, "games_started": 0, "innings_pitched": 0.0, "batters_faced": 0,
                        "number_of_pitches": 0, "hits": 0, "runs": 0, "earned_runs": 0, "walks": 0,
                        "strikeouts": 0, "hit_by_pitches": 0, "left_on_base": 0
                    }

            # Fetch existing defensive stats to sum correctly
            cursor.execute("SELECT * FROM defensive_stats WHERE player_id = %s LIMIT 1;", (player_id,))
            existing_def = cursor.fetchone() or {}

            new_inn_p = add_fractional_innings(float(existing_def.get("innings_p") or 0.0), float(p.get("innings_p") or 0.0))
            new_inn_c = add_fractional_innings(float(existing_def.get("innings_c") or 0.0), float(p.get("innings_c") or 0.0))
            new_inn_1b = add_fractional_innings(float(existing_def.get("innings_1b") or 0.0), float(p.get("innings_1b") or 0.0))
            new_inn_2b = add_fractional_innings(float(existing_def.get("innings_2b") or 0.0), float(p.get("innings_2b") or 0.0))
            new_inn_3b = add_fractional_innings(float(existing_def.get("innings_3b") or 0.0), float(p.get("innings_3b") or 0.0))
            new_inn_ss = add_fractional_innings(float(existing_def.get("innings_ss") or 0.0), float(p.get("innings_ss") or 0.0))
            new_inn_lf = add_fractional_innings(float(existing_def.get("innings_lf") or 0.0), float(p.get("innings_lf") or 0.0))
            new_inn_cf = add_fractional_innings(float(existing_def.get("innings_cf") or 0.0), float(p.get("innings_cf") or 0.0))
            new_inn_rf = add_fractional_innings(float(existing_def.get("innings_rf") or 0.0), float(p.get("innings_rf") or 0.0))

            # Update defensive_stats
            cursor.execute(
                """
                INSERT INTO defensive_stats (
                    player_id, team_id, total_chances, assists, putouts, errors,
                    innings_p, innings_c, innings_1b, innings_2b, innings_3b, innings_ss, innings_lf, innings_cf, innings_rf, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id) DO UPDATE
                SET total_chances = EXCLUDED.total_chances, assists = EXCLUDED.assists,
                    putouts = EXCLUDED.putouts, errors = EXCLUDED.errors,
                    innings_p = EXCLUDED.innings_p, innings_c = EXCLUDED.innings_c,
                    innings_1b = EXCLUDED.innings_1b, innings_2b = EXCLUDED.innings_2b,
                    innings_3b = EXCLUDED.innings_3b, innings_ss = EXCLUDED.innings_ss,
                    innings_lf = EXCLUDED.innings_lf, innings_cf = EXCLUDED.innings_cf,
                    innings_rf = EXCLUDED.innings_rf, updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p.get("total_chances", 0), p.get("assists", 0), p.get("putouts", 0), p.get("errors", 0),
                    new_inn_p, new_inn_c, new_inn_1b, new_inn_2b, new_inn_3b, new_inn_ss, new_inn_lf, new_inn_cf, new_inn_rf
                )
            )
            def_row = cursor.fetchone()

            # Update catching_stats
            cursor.execute(
                """
                INSERT INTO catching_stats (
                    player_id, team_id, innings_caught, passed_balls_allowed, runners_stolen_bases, runners_caught_stealing, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id) DO UPDATE
                SET innings_caught = EXCLUDED.innings_caught, passed_balls_allowed = EXCLUDED.passed_balls_allowed,
                    runners_stolen_bases = EXCLUDED.runners_stolen_bases, runners_caught_stealing = EXCLUDED.runners_caught_stealing,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
                """,
                (
                    player_id, team_id, p.get("innings_caught", 0.0), p.get("passed_balls_allowed", 0),
                    p.get("runners_stolen_bases", 0), p.get("runners_caught_stealing", 0)
                )
            )
            cat_row = cursor.fetchone()

            if player_row and stats_row and pit_row and def_row and cat_row:
                full_player = {
                    **dict(stats_row),
                    "games_pitched": pit_row["games_pitched"],
                    "games_started": pit_row["games_started"],
                    "innings_pitched": float(pit_row["innings_pitched"]),
                    "batters_faced": pit_row["batters_faced"],
                    "number_of_pitches": pit_row["number_of_pitches"],
                    "hits_allowed": pit_row["hits"],
                    "runs_allowed": pit_row["runs"],
                    "earned_runs": pit_row["earned_runs"],
                    "walks_allowed": pit_row["walks"],
                    "strikeouts_thrown": pit_row["strikeouts"],
                    "hit_by_pitches_allowed": pit_row["hit_by_pitches"],
                    "left_on_base": pit_row["left_on_base"],
                    "total_chances": def_row["total_chances"],
                    "assists": def_row["assists"],
                    "putouts": def_row["putouts"],
                    "errors": def_row["errors"],
                    "innings_p": float(def_row["innings_p"] or 0.0),
                    "innings_c": float(def_row["innings_c"] or 0.0),
                    "innings_1b": float(def_row["innings_1b"] or 0.0),
                    "innings_2b": float(def_row["innings_2b"] or 0.0),
                    "innings_3b": float(def_row["innings_3b"] or 0.0),
                    "innings_ss": float(def_row["innings_ss"] or 0.0),
                    "innings_lf": float(def_row["innings_lf"] or 0.0),
                    "innings_cf": float(def_row["innings_cf"] or 0.0),
                    "innings_rf": float(def_row["innings_rf"] or 0.0),
                    "innings_caught": float(cat_row["innings_caught"]),
                    "passed_balls_allowed": cat_row["passed_balls_allowed"],
                    "runners_stolen_bases": cat_row["runners_stolen_bases"],
                    "runners_caught_stealing": cat_row["runners_caught_stealing"],
                    "innings_per_game": innings_per_game,
                    **dict(player_row)
                }
                updated_players.append(calculate_derived_stats(full_player))
                
        conn.commit()
        return updated_players
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_coach_by_email(email: str):
    """Retrieves a coach profile by their email address."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, username, coach_name, location, primary_age_group
            FROM coaches
            WHERE username = %s
            """,
            (email.lower().strip(),)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        cursor.close()
        conn.close()

def check_is_head_coach(coach_id: int, team_id: int) -> bool:
    """Returns true if the coach is a head coach for the specified team."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT role FROM team_coaches WHERE coach_id = %s and team_id = %s LIMIT 1;",
            (coach_id, team_id)
        )
        row = cursor.fetchone()
        return row is not None and row["role"] == "Head Coach"
    finally:
        cursor.close()
        conn.close()
    
def add_coach_to_team(team_id: int, email: str, role: str) -> dict:
    """Finds a coach by email and links thenm to the team with the specified role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Resolve email to coach_id
        cursor.execute("SELECT id, coach_name FROM coaches WHERE username = %s LIMIT 1;", (email.lower().strip(),))
        coach_row = cursor.fetchone()
        if not coach_row:
            return {"success": False, "error": "No coach registered with that email address"}
        
        coach_id = coach_row["id"]

        # 2. Insert link into team_coaches
        cursor.execute(
            """
            INSERT INTO team_coaches (team_id, coach_id, role, is_active)
            VALUES (%s, %s, %s, false)
            ON CONFLICT (team_id, coach_id) DO UPDATE SET role = EXCLUDED.role;
            """,
            (team_id, coach_id, role)
        )
        conn.commit()
        return { "success": True, "coach_name": coach_row["coach_name"]}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()
        conn.close()

# A simple local in-memory TTL (Time-To-Live) cache
class SimpleTTLCache:
    def __init__(self, ttl_seconds: int = 300): # Defaults to 5 minutes
        self.ttl = ttl_seconds
        self.cache = {}

    def get(self, key: str):
        if key in self.cache:
            val, expiry = self.cache[key]
            if time.time() < expiry:
                return val
            # Expired
            del self.cache[key]
        return None

    def set(self, key: str, value: any):
        self.cache[key] = (value, time.time() + self.ttl)

# Instantiate a global cache for prompts
_prompt_cache = SimpleTTLCache(ttl_seconds=300)

def get_system_prompt(key: str, fallback_content: str) -> str:
    """Retrieves the system prompt content from cache, falling back to database or hardcoded text."""
    # 1. Try reading from memory cache
    cached_prompt = _prompt_cache.get(key)
    if cached_prompt:
        return cached_prompt

    # 2. Try reading from the database
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT content FROM system_prompts WHERE key = %s LIMIT 1;", (key,))
        row = cursor.fetchone()
        if row:
            content = row["content"]
            # Save to cache
            _prompt_cache.set(key, content)
            return content
    except Exception as e:
        print(f"Warning: Failed to fetch prompt '{key}' from database: {e}")
    finally:
        cursor.close()
        conn.close()

    # 3. Fallback to hardcoded content if database is empty or connection fails
    return fallback_content

def update_player_eligibility(player_id: int, eligible_positions: str):
    """Updates the allowed positions list for a specific player."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE players SET eligible_positions = %s WHERE id = %s;",
            (eligible_positions, player_id)
        )
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

def save_team_lineup(team_id: int, coach_id: int, game_date: str, opponent: str, innings_count: int, lineup_data: dict):
    """Saves or overwrites a team lineup for a specific game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if game lineup already exists to overwrite it
        cursor.execute(
            "SELECT id FROM lineups WHERE team_id = %s AND game_date = %s AND opponent = %s LIMIT 1;",
            (team_id, game_date, opponent)
        )
        existing = cursor.fetchone()

        import json
        json_data = json.dumps(lineup_data)

        if existing:
            cursor.execute(
                "UPDATE lineups SET innings_count = %s, lineup_data = %s, created_by_coach_id = %s WHERE id = %s RETURNING id;",
                (innings_count, json_data, coach_id, existing["id"])
            )
        else:
            cursor.execute(
                "INSERT INTO lineups (team_id, created_by_coach_id, game_date, opponent, innings_count, lineup_data) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
                (team_id, coach_id, game_date, opponent, innings_count, json_data)
            )
        conn.commit()
        return cursor.fetchone()["id"]
    finally:
        cursor.close()
        conn.close()

def get_team_lineups(team_id: int):
    """Fetches all save lineups for a specificd team."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, game_date, opponent, innings_count, lineup_data, created_at FROM lineups where team_id = %s ORDER BY game_date DESC, created_at DESC;",
            (team_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def delete_team_lineup(lineup_id: int):
    """Deletes a saved lineup."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM lineups WHERE id = %s;", (lineup_id,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()