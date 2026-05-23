import sqlite3
import hashlib

def get_db_connection():
    """Establishes connection to the SQLite database file."""
    conn = sqlite3.connect("softball_ap.db")
    conn.row_factory = sqlite3.Row
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
    """Attempts to insert a new coach profile into the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pwd_hash = hash_password(password)
        cursor.execute('''
            INSERT INTO coaches (username, password_hash, coach_name, location, primary_age_group)
                       VALUES (?, ?, ?, ?, ?)
                       ''', (username.lower().strip(), pwd_hash, coach_name.strip(), location.strip(), age_group))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
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