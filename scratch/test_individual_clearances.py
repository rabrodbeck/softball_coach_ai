import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import LineupGenerator

players_template = [
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

def run_test(player_idx):
    temp = [dict(p) for p in players_template]
    # Make player_idx eligible for ALL positions
    temp[player_idx]["eligible_positions"] = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
    
    generator = LineupGenerator(temp, 6)
    return generator.generate().get("success", False)

from itertools import combinations

from itertools import combinations

def run_test_triple(idx1, idx2, idx3):
    temp = [dict(p) for p in players_template]
    all_pos = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
    temp[idx1]["eligible_positions"] = all_pos
    temp[idx2]["eligible_positions"] = all_pos
    temp[idx3]["eligible_positions"] = all_pos
    
    generator = LineupGenerator(temp, 6)
    return generator.generate().get("success", False)

print("Testing triples of players fully eligible:")
for idx1, idx2, idx3 in combinations(range(len(players_template)), 3):
    p1 = players_template[idx1]
    p2 = players_template[idx2]
    p3 = players_template[idx3]
    res = run_test_triple(idx1, idx2, idx3)
    if res:
        print(f" -> Success! Make {p1['name']}, {p2['name']}, and {p3['name']} eligible for all.")
        break


