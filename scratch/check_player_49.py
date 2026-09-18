import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(db_url)
cursor = conn.cursor(cursor_factory=RealDictCursor)

cursor.execute("SELECT * FROM players WHERE id = 49;")
player = cursor.fetchone()
print("PLAYER 49:", dict(player) if player else "Not found")

cursor.execute("SELECT * FROM offensive_stats WHERE player_id = 49;")
off = cursor.fetchone()
print("OFFENSIVE STATS:", dict(off) if off else "None")

cursor.execute("SELECT * FROM pitching_stats WHERE player_id = 49;")
pitch = cursor.fetchone()
print("PITCHING STATS:", dict(pitch) if pitch else "None")

cursor.execute("SELECT * FROM defensive_stats WHERE player_id = 49;")
defense = cursor.fetchone()
print("DEFENSIVE STATS:", dict(defense) if defense else "None")

cursor.execute("SELECT * FROM catching_stats WHERE player_id = 49;")
catch = cursor.fetchone()
print("CATCHING STATS:", dict(catch) if catch else "None")

cursor.execute("SELECT * FROM position_innings WHERE player_id = 49;")
pos = cursor.fetchone()
print("POSITION INNINGS:", dict(pos) if pos else "None")

cursor.close()
conn.close()
