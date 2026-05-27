# import sqlite3
import hashlib
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import os

DATABASE_URL = os.environ.get("DATABASE_URL")

# def get_db_connection():
#     """Establishes connection to the SQLite database file."""
#     # Checks if running on Hugging Face Spaces with a mounted storage bucket
#     if os.path.exists("/data"):
#         DB_PATH = "/data/softball_ap.db"
#     else:
#         BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#         DB_PATH = os.path.join(BASE_DIR, "softball_ap.db")
        
#     # conn = sqlite3.connect("softball_ap.db")
#     conn = sqlite3.connect(DB_PATH)
#     conn.row_factory = sqlite3.Row
#     return conn
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

# def register_coach(username, password, coach_name, location, age_group):
#     """Attempts to insert a new coach profile into the SQLite database."""
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     try:
#         pwd_hash = hash_password(password)
#         cursor.execute('''
#             INSERT INTO coaches (username, password_hash, coach_name, location, primary_age_group)
#                        VALUES (?, ?, ?, ?, ?)
#                        ''', (username.lower().strip(), pwd_hash, coach_name.strip(), location.strip(), age_group))
#         conn.commit()
#         return True
#     except sqlite3.IntegrityError:
#         return False
#     finally:
#         conn.close()
def register_coach(username, password, coach_name, location, age_group):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pwd_hash = hash_password(password)
        cursor.execute(
            """
            INSERT INTO coaches (username, password_hash, coach_namne, location, primary_age_group)
            VALUE (%s, %s, %s, %s, %s)
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
    """Validates credentials against hashed database entries."""
    conn = get_db_connection()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    cursor.execute('''
                   SELECT username, coach_name, location, primary_age_group
                   FROM coaches
                   WHERE username = ? AND password_hash = ?
                   ''', (username.lower().strip(), pwd_hash))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
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