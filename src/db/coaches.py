import hashlib
import re
import psycopg2
from src.db.pool import get_db_connection

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

def get_team_coaches(team_id: int) -> list:
    """Retrieves all coahces associatied with a team, including their name and role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT c.coach_name, tc.role
            FROM team_coaches tc
            JOIN coaches c ON tc.coach_id = c.id
            WHERE tc.team_id = %s
            ORDER BY tc.role DESC, c.coach_name ASC;
            """,
            (team_id)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()