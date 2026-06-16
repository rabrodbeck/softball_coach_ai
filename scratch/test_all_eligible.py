import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import LineupGenerator

base_players = [
    {"id": 1, "name": "Addy M (#3)", "eligible_positions": ['2B', 'RF']},
    {"id": 2, "name": "Anna T (#5)", "eligible_positions": ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF']},
    {"id": 3, "name": "Audrey B (#11)", "eligible_positions": ['P', 'C', '1B', '3B', 'LF', 'CF']},
    {"id": 4, "name": "Autumn L (#8)", "eligible_positions": ['3B', 'SS', 'LF', 'CF', 'RF']},
    {"id": 5, "name": "Hannah L (#6)", "eligible_positions": ['2B', 'SS', 'LF', 'CF', 'RF']},
    {"id": 6, "name": "Isabella V (#1)", "eligible_positions": ['2B', 'SS', 'LF', 'CF', 'RF']},
    {"id": 7, "name": "Katherine M (#2)", "eligible_positions": ['2B', 'SS', 'LF', 'CF', 'RF']},
    {"id": 8, "name": "Olivia B (#9)", "eligible_positions": ['P', '1B', '3B', 'LF', 'CF']},
    {"id": 9, "name": "Scarlett S (#10)", "eligible_positions": ['C', '1B', '3B', 'LF', 'CF']},
    {"id": 10, "name": "Sofia M (#7)", "eligible_positions": ['P', '1B', '3B', 'SS', 'LF', 'CF']},
]

def main():
    # Make everyone eligible for ALL positions
    all_pos = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
    unrestricted_players = []
    for p in base_players:
        unrestricted_players.append({
            "id": p["id"],
            "name": p["name"],
            "eligible_positions": all_pos
        })
        
    generator = LineupGenerator(unrestricted_players, 6)
    result = generator.generate()
    if result.get("success"):
        print("Sanity Check: SUCCESS! Solver found a solution when everyone is fully eligible.")
    else:
        print(f"Sanity Check: FAILED! Solver could not find a solution even when everyone is fully eligible. Error: {result.get('error')}")

if __name__ == "__main__":
    main()
