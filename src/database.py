import hashlib
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    """Creates the coaches table automatically if it does not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS coaches (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   username TEXT UNIQUE NOT NULL,
                   password_hash TEXT NOT NULL,
                   coach_name TEXT NOT NULL,
                   location TEXT NOT NULL,
                   primary_age_group TEXT NOT NULL
                   )
                   ''')
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

def create_team(coach_id: int, team_name: str, season: str, age_group: str):
    """Creates a new team. If it's the first team, set it as active."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Automatically default all newly created teams to active
        is_active = True

        cursor.execute(
            """
            INSERT INTO teams (coach_id, team_name, season, age_group, is_active)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, team_name, season, age_group, wins, losses, ties, is_active;
            """,
            (coach_id, team_name.strip(), season.strip(), age_group, is_active)
        )
        new_team = cursor.fetchone()
        conn.commit()
        return dict(new_team) if new_team else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_coach_teams(coach_id: int):
    """Retrieves all teams managed by a specific coach."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, team_name, season, age_group, wins, losses, ties, is_active
            FROM teams
            WHERE coach_id = %s
            ORDER BY created_at DESC;
            """,
            (coach_id,)
        )
        teams = cursor.fetchall()
        return [dict(team) for team in teams]
    finally:
        cursor.close()
        conn.close()

def set_active_team(coach_id: int, team_id: int):
    """Sets a specific team as active and de-activates all other teams for this coach."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. De-activate all teams for this coach
        cursor.execute(
            "UPDATE teams SET is_active = false where coach_id = %s", (coach_id,)
        )
        # 2. Activate the selected team
        cursor.execute(
            """
            UPDATE teams SET is_active = true 
            WHERE coach_id = %s AND id = %s
            RETURNING id, team_name, season, age_group, wins, losses, ties, is_active;
            """,
            (coach_id, team_id)
        )
        active_team = cursor.fetchone()
        conn.commit()
        return dict(active_team) if active_team else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def update_team(coach_id: int, team_id: int, team_name: str, season: str, wins: int, losses: int, ties: int, age_group: str, is_active: bool):
    """Updates a team's details."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE teams 
            SET team_name = %s, season = %s, wins = %s, losses = %s, ties = %s, age_group = %s, is_active = %s
            WHERE id = %s AND coach_id = %s
            RETURNING id, team_name, season, age_group, wins, losses, ties, is_active;
            """,
            (team_name.strip(), season.strip(), wins, losses, ties, age_group, is_active, team_id, coach_id))
        updated_team = cursor.fetchone()
        conn.commit()
        return dict(updated_team) if updated_team else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def convert_ip_to_actual(ip: float) -> float:
    """Converts scoring notation (ex: 4.1, 4.2) to actual decimal innings (ex: 4.333, 4.667)."""
    whole = int(ip)
    fraction = round(ip - whole, 1)
    if fraction == 0.1:
        return whole + 0.333
    elif fraction == 0.2:
        return whole + 0.667
    return float(whole)

def calculate_derived_pitching_stats(stats: dict):
    """Calculates ERA and WHIP based on softball 7-inning rules."""
    ip = float(stats.get("innings_pitched", 0.0))
    er = stats.get("earned_runs", 0)
    bb = stats.get("walks_allowed", 0)       # Use walks_allowed to avoid conflict with batting walks
    hits = stats.get("hits_allowed", 0)      # Use hits_allowed to avoid conflict with batting hits

    # 1. Convert innings pitched to actual float value using helper
    actual_ip = convert_ip_to_actual(ip)

    # 2. Calculate ERA and WHIP (initializing variables in all branches)
    if actual_ip > 0:
        era = (er * 7.0) / actual_ip
        whip = (bb + hits) / actual_ip
    else:
        era = 0.0
        whip = 0.0

    result = dict(stats)
    result["era"] = round(era, 2)
    result["whip"] = round(whip, 2)
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

    # Return copies of the dict containing calculated fields
    result = dict(player)
    result["hits"] = hits
    result["batting_average"] = round(avg, 3)
    result["on_base_percentage"] = round(obp, 3)
    
    # 4. Chain calculations for pitching stats (ERA and WHIP)
    return calculate_derived_pitching_stats(result)

def add_player(team_id: int, name: str, number: int, handedness: str, parent_player_id: int = None):
    """Creates a new player on a team with corresponding empty stats rows in both tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Insert core player info into players table
        cursor.execute(
            """
            INSERT INTO players (team_id, player_name, player_number, handedness, parent_player_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (team_id, name.strip(), number, handedness, parent_player_id)
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None
            
        player_id = player_row["id"]
        
        # 2. Insert corresponding 0-stats row into offensive_stats
        cursor.execute(
            """
            INSERT INTO offensive_stats (player_id, team_id)
            VALUES (%s, %s)
            RETURNING *;
            """,
            (player_id, team_id)
        )
        off_row = cursor.fetchone()

        # 3. Insert corresponding 0-stats row into pitching_stats
        cursor.execute(
            """
            INSERT INTO pitching_stats (player_id, team_id)
            VALUES (%s, %s)
            RETURNING *;
            """,
            (player_id, team_id)
        )
        pit_row = cursor.fetchone()
        
        conn.commit()
        
        # 4. Merge dicts (Merging player_row LAST to ensure player ID wins over stats ID keys)
        full_player = {
            **dict(off_row),
            **dict(pit_row),
            **dict(player_row)  # This guarantees 'id' is the player ID
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
                p.id, p.team_id, p.player_name, p.player_number, p.handedness, p.games_played, p.parent_player_id, p.created_at, p.updated_at,
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
                COALESCE(p_stats.left_on_base, 0) as left_on_base
            FROM players p
            LEFT JOIN offensive_stats o ON p.id = o.player_id
            LEFT JOIN pitching_stats p_stats ON p.id = p_stats.player_id -- Fixed p to p_stats alias here
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

def update_player_stats(player_id: int, stats: dict):
    """Updates core details in players and stats in offensive_stats within a transaction."""
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        parent_id = stats.get("parent_player_id")

        # 1. Update players (games_played, name, number, handedness, parent_player_id)
        cursor.execute(
            """
            UPDATE players
            SET player_name = %s, player_number = %s, handedness = %s, games_played = %s, parent_player_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
            """,
            (
                stats["player_name"].strip(), stats["player_number"], stats["handedness"],
                stats["games_played"], parent_id, player_id
            )
        )
        player_row = cursor.fetchone()
        if not player_row:
            return None

        # 2. Update/Insert offensive_stats
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
                player_id, player_row["team_id"], stats["plate_appearances"], stats["at_bats"],
                stats["singles"], stats["doubles"], stats["triples"], stats["home_runs"],
                stats["walks"], stats["strikeouts"], stats["hit_by_pitches"],
                stats["stolen_bases"], stats["caught_stealing"],
                stats["runs_scored"], stats["runs_batted_in"]
            )
        )
        stats_row = cursor.fetchone()
        
        # 3. Update/Insert pitching_stats
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
                player_id, player_row["team_id"], stats.get("games_pitched", 0), stats.get("games_started", 0),
                stats.get("innings_pitched", 0.0), stats.get("batters_faced", 0), stats.get("number_of_pitches", 0),
                stats.get("hits_allowed", 0), stats.get("runs_allowed", 0), stats.get("earned_runs", 0),
                stats.get("walks_allowed", 0), stats.get("strikeouts_thrown", 0), stats.get("hit_by_pitches_allowed", 0),
                stats.get("left_on_base", 0)
            )
        )
        pit_row = cursor.fetchone()
        conn.commit()

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
            **dict(player_row)
        }
        return calculate_derived_stats(full_player)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def delete_player(player_id: int):
    """Removes a player from the players table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM players WHERE id = %s RETURNING id;", (player_id,))
        row = cursor.fetchone()
        conn.commit()
        return row is not None
    finally:
        cursor.close()
        conn.close()

def bulk_update_player_stats(team_id: int, updates: list):
    """Updates multiple players stats inside a split-table players structure."""
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        updated_players = []
        for p in updates:
            number = p.get("player_number")
            name = p.get("player_name", "").strip()
            
            # Find player row by jersey number (if specified) or name
            if number > 0:
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
                        "games_pitched": 0,
                        "games_started": 0,
                        "innings_pitched": 0.0,
                        "batters_faced": 0,
                        "number_of_pitches": 0,
                        "hits": 0,
                        "runs": 0,
                        "earned_runs": 0,
                        "walks": 0,
                        "strikeouts": 0,
                        "hit_by_pitches": 0,
                        "left_on_base": 0
                    }

            if player_row and stats_row and pit_row:
                # Merge dicts (prefixing pitching stats to avoid naming collisions, player_row last)
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