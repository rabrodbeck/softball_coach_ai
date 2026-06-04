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
    return result

def add_player(team_id: int, name: str, number: int, handedness: str):
    """Creates a new player on a team with 0 starting stats."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO rosters (team_id, player_name, player_number, handedness)
            VALUES (%s, %s, %s, %s)
            RETURNING *;
            """,
            (team_id, name.strip(), number, handedness)
        )
        row = cursor.fetchone()
        conn.commit()
        return calculate_derived_stats(row) if row else None
    finally:
        cursor.close()
        conn.close()

def get_team_roster(team_id: int):
    """Retrieves all players on a team, including derived batting stats."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT * FROM rosters
            WHERE team_id = %s
            ORDER BY player_name ASC;
            """,
            (team_id,)
        )
        rows = cursor.fetchall()
        return [calculate_derived_stats(row) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_player_stats(player_id: int, stats: dict):
    """Updates raw player stats and refreshes updated_at timestamp."""
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE rosters
            SET player_name = %s, player_number = %s, handedness = %s,
                games_played = %s, plate_appearances = %s, at_bats = %s,
                singles = %s, doubles = %s, triples = %s, home_runs = %s,
                walks = %s, strikeouts = %s, hit_by_pitches = %s,
                stolen_bases = %s, caught_stealing = %s,
                runs_scored = %s, runs_batted_in = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
            """,
            (
                stats["player_name"].strip(), stats["player_number"], stats["handedness"],
                stats["games_played"], stats["plate_appearances"], stats["at_bats"],
                stats["singles"], stats["doubles"], stats["triples"], stats["home_runs"],
                stats["walks"], stats["strikeouts"], stats["hit_by_pitches"],
                stats["stolen_bases"], stats["caught_stealing"],
                stats["runs_scored"], stats["runs_batted_in"],
                player_id
            )
        )
        row = cursor.fetchone()
        conn.commit()
        return calculate_derived_stats(row) if row else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def delete_player(player_id: int):
    """Removes a player from the roster"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM rosters WHERE id = %s RETURNING id;", (player_id,))
        row = cursor.fetchone()
        conn.commit()
        return row is not None
    finally:
        cursor.close()
        conn.close()

def bulk_update_roster_stats(team_id: int, updates: list):
    """Updates multiple players stats in a single database transaction."""
    conn = get_db_connection()
    cursor = conn.conn.cursor() if hasattr(conn, 'conn') else conn.cursor()
    try:
        updated_players = []
        for p in updates:
            number = p.get("player_number")
            name = p.get("player_name", "").strip()
            
            # Find player ID by jersey number (if specified) or name (if number is unassigned/0)
            if number > 0:
                cursor.execute(
                    """
                    SELECT id FROM rosters 
                    WHERE team_id = %s AND player_number = %s
                    LIMIT 1;
                    """,
                    (team_id, number)
                )
            else:
                cursor.execute(
                    """
                    SELECT id FROM rosters 
                    WHERE team_id = %s AND LOWER(player_name) = LOWER(%s)
                    LIMIT 1;
                    """,
                    (team_id, name)
                )
            row = cursor.fetchone()
            if not row:
                continue
                
            player_id = row["id"]
            
            # Update raw counts
            cursor.execute(
                """
                UPDATE rosters
                SET games_played = %s, plate_appearances = %s, at_bats = %s,
                    singles = %s, doubles = %s, triples = %s, home_runs = %s,
                    walks = %s, strikeouts = %s, hit_by_pitches = %s,
                    stolen_bases = %s, caught_stealing = %s,
                    runs_scored = %s, runs_batted_in = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *;
                """,
                (
                    p["games_played"], p["plate_appearances"], p["at_bats"],
                    p["singles"], p["doubles"], p["triples"], p["home_runs"],
                    p["walks"], p["strikeouts"], p["hit_by_pitches"],
                    p["stolen_bases"], p["caught_stealing"],
                    p["runs_scored"], p["runs_batted_in"],
                    player_id
                )
            )
            updated_row = cursor.fetchone()
            if updated_row:
                updated_players.append(calculate_derived_stats(updated_row))
                
        conn.commit()
        return updated_players
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()