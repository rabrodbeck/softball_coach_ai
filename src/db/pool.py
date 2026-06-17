import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv

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
                   team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
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

