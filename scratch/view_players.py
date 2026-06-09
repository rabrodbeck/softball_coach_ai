import sys
import os

# Add the project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database import get_coach_teams, get_team_players

def main():
    print("=== Coach Teams ===")
    teams = get_coach_teams(1)
    for t in teams:
        print(f"Team ID: {t['id']}, Name: {t['team_name']}, Age: {t['age_group']}")
        print("=== Players and Position Innings ===")
        players = get_team_players(t['id'])
        for p in players:
            pos_list = []
            for pos_name, key in [("P", "innings_p"), ("C", "innings_c"), ("1B", "innings_1b"), ("2B", "innings_2b"), ("3B", "innings_3b"), ("SS", "innings_ss"), ("LF", "innings_lf"), ("CF", "innings_cf"), ("RF", "innings_rf")]:
                val = p.get(key, 0.0)
                if val > 0:
                    pos_list.append(f"{pos_name}={val:.1f}")
            pos_str = ", ".join(pos_list) if pos_list else "None"
            print(f"  Player: {p['player_name']} (Jersey #{p['player_number']}) - Positions: {pos_str}")

if __name__ == "__main__":
    main()
