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
    """Initializes the database schema for multi-season career statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create coaches table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS coaches (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            coach_name TEXT NOT NULL,
            location TEXT NOT NULL,
            primary_age_group TEXT NOT NULL
        );
    ''')
    
    # 2. Create players_teams join table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players_teams (
            player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
            team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
            player_number INTEGER,
            games_played INTEGER DEFAULT 0,
            PRIMARY KEY (player_id, team_id)
        );
    ''')
    
    # 3. Alter players table to remove team specific keys and add eligibility
    cursor.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS eligible_positions VARCHAR(255) DEFAULT 'P,C,1B,2B,SS,3B,LF,CF,RF';")
    cursor.execute("ALTER TABLE players DROP COLUMN IF EXISTS team_id;")
    cursor.execute("ALTER TABLE players DROP COLUMN IF EXISTS player_number;")
    cursor.execute("ALTER TABLE players DROP COLUMN IF EXISTS games_played;")
    
    # 4. Alter stats tables
    cursor.execute("ALTER TABLE offensive_stats ADD COLUMN IF NOT EXISTS reached_on_error INTEGER DEFAULT 0;")
    
    # 5. Recreate indexes for stats tables using composite key (player_id, team_id)
    cursor.execute("DROP INDEX IF EXISTS idx_offensive_stats_player_id;")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_offensive_stats_player_team ON offensive_stats (player_id, team_id);")
    
    cursor.execute("DROP INDEX IF EXISTS idx_pitching_stats_player_id;")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_pitching_stats_player_team ON pitching_stats (player_id, team_id);")

    cursor.execute("ALTER TABLE defensive_stats DROP CONSTRAINT IF EXISTS defensive_stats_player_id_key;")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_defensive_stats_player_team ON defensive_stats (player_id, team_id);")

    cursor.execute("ALTER TABLE catching_stats DROP CONSTRAINT IF EXISTS catching_stats_player_id_key;")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_catching_stats_player_team ON catching_stats (player_id, team_id);")

    # 6. Create lineups table
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
        );
    """)
    cursor.execute("ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;")

    conn.commit()
    cursor.close()
    conn.close()

