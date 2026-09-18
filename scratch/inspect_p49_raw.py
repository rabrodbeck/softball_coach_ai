from src.db.players import get_team_players
import json

for tid in [5, 6]:
    roster = get_team_players(tid)
    p49 = next((p for p in roster if p["id"] == 49), None)
    if p49:
        print(f"=== TEAM {tid} PLAYER 49 ===")
        for k, v in p49.items():
            print(f"  {k}: {repr(v)} ({type(v).__name__})")
