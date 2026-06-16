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

def test_add_pos(player_idx, pos):
    temp = [dict(p) for p in base_players]
    temp[player_idx]["eligible_positions"] = temp[player_idx]["eligible_positions"] + [pos]
    generator = LineupGenerator(temp, 6)
    return generator.generate().get("success", False)

all_pos = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
print("Searching for single position additions that enable a solution...")
for idx, p in enumerate(base_players):
    for pos in all_pos:
        if pos not in p["eligible_positions"]:
            if test_add_pos(idx, pos):
                print(f" -> SUCCESS: Add {pos} to {p['name']}")
