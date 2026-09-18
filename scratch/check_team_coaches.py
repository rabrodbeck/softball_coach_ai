from src.db.pool import get_db_connection

conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT * FROM team_coaches;")
cts = cur.fetchall()
print("TEAM_COACHES:")
for ct in cts:
    print(" ", dict(ct))

cur.execute("SELECT id, team_name FROM teams;")
teams = cur.fetchall()
print("TEAMS:")
for t in teams:
    print(" ", dict(t))

cur.close()
conn.close()
