import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Get column details for pitching_stats
cur.execute("""
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'pitching_stats';
""")
rows = cur.fetchall()
print("pitching_stats columns:")
for r in rows:
    print(r)

conn.close()
