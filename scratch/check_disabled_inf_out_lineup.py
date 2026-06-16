import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import LineupGenerator, POSITIONS, INFIELD, OUTFIELD

players = [
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

class CustomLineupGenerator(LineupGenerator):
    def _verify_inf_out_rotation(self, position_history: dict) -> bool:
        return True # Disable the rule

generator = CustomLineupGenerator(players, 6)
result = generator.generate()
if result.get("success"):
    print("Working lineup (with Infield/Outfield rule disabled):")
    for inn in result["innings"]:
        print(f"\nInning {inn['inning']}:")
        print(f"  Bench: {[p['name'] for p in players if p['id'] in inn['bench']]}")
        for pos, pid in inn["assignments"].items():
            print(f"  {pos}: {next(p['name'] for p in players if p['id'] == pid)}")
else:
    print("Failed to generate even with rule disabled.")
