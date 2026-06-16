import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from src.database import get_db_connection, get_team_players
from src.lineup_generator import LineupGenerator

def main():
    team_id = 2
    # We want to mimic the generation call:
    # 1. Fetch present players with their eligible positions
    players = get_team_players(team_id)
    if not players:
        print("No players found for Team 2.")
        return

    print(f"Loaded {len(players)} players for Team 2.")
    
    # Format players for solver
    players_data = []
    for p in players:
        positions_str = p.get("eligible_positions") or "P,C,1B,2B,3B,SS,LF,CF,RF"
        eligible = [pos.strip() for pos in positions_str.split(",") if pos.strip()]
        players_data.append({
            "id": p["id"],
            "name": p["player_name"],
            "eligible_positions": eligible
        })
        print(f" - {p['player_name']} (#{p['player_number']}): {eligible}")

    innings_count = 6 # Default innings count
    print(f"\nRunning solver with innings_count={innings_count}...")
    
    # We can instrument the solver to see where it gets stuck
    generator = LineupGenerator(players_data, innings_count)
    
    # Let's count how many players are eligible for each position
    pos_counts = {}
    for pos in ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]:
        pos_counts[pos] = sum(1 for p in players_data if pos in p["eligible_positions"])
    print("\nPosition eligibility counts:")
    for pos, count in pos_counts.items():
        print(f" - {pos}: {count} eligible player(s)")

    # Run the generator
    result = generator.generate()
    if result.get("success"):
        print("\nSuccess! Lineup generated.")
    else:
        print(f"\nSolver failed: {result.get('error')}")

if __name__ == "__main__":
    main()
