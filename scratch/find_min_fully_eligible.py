import sys
import os
from itertools import combinations

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

def run_test_k(comb):
    temp = [dict(p) for p in players_template]
    all_pos = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
    for idx in comb:
        temp[idx]["eligible_positions"] = all_pos
    
    generator = LineupGenerator(temp, 6)
    return generator.generate().get("success", False)

for k in range(1, 10):
    print(f"Testing k={k} fully eligible players...")
    found = False
    for comb in combinations(range(len(players_template)), k):
        if run_test_k(comb):
            names = [players_template[idx]["name"] for idx in comb]
            print(f" -> Found working configuration at k={k}: {names}")
            found = True
            break
    if found:
        break
