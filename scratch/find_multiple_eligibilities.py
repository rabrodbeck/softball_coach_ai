import sys
import os
from itertools import combinations, product

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import POSITIONS, INFIELD, OUTFIELD

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

def test_config(players_list):
    player_ids = [p["id"] for p in players_list]
    player_map = {p["id"]: p for p in players_list}
    
    bench_history = {pid: [] for pid in player_ids}
    position_history = {pid: [] for pid in player_ids}

    def check_inf_out(pos_hist):
        for pid in player_ids:
            hist = pos_hist[pid]
            active = [p for p in hist if p != "Bench"]
            has_inf = any(p in INFIELD for p in active)
            has_out = any(p in OUTFIELD for p in active)
            is_battery_exempt = (hist.count("P") == 3 or hist.count("C") == 3) and hist[3] == "Bench"
            if not is_battery_exempt and (not has_inf or not has_out):
                return False
        return True

    def solve_inn(inn):
        if inn > 4:
            return check_inf_out(position_history)

        sat_once = {pid for pid, hist in bench_history.items() if any(x > 0 for x in hist)}
        candidates = [pid for pid in player_ids if not (bench_history[pid] and bench_history[pid][-1] > 0)]
        candidates = [pid for pid in candidates if len(sat_once) == len(player_ids) or not any(x > 0 for x in bench_history[pid])]
        
        bench_combos = list(combinations(candidates, 1))
        for (benched_pid,) in bench_combos:
            bench_history[benched_pid].append(inn)
            for pid in player_ids:
                if pid != benched_pid:
                    bench_history[pid].append(0)

            active_pids = [pid for pid in player_ids if pid != benched_pid]
            assignments = {}
            if assign(active_pids, POSITIONS, 0, inn, position_history, assignments):
                for pos, pid in assignments.items():
                    position_history[pid].append(pos)
                position_history[benched_pid].append("Bench")

                if solve_inn(inn + 1):
                    return True

                for pid in player_ids:
                    position_history[pid].pop()
            
            for pid in player_ids:
                bench_history[pid].pop()
        return False

    def assign(active_pids, positions_left, pos_idx, inn, pos_hist, assignments):
        if pos_idx >= len(positions_left):
            return True
        pos = positions_left[pos_idx]
        for pid in active_pids:
            if pid in assignments.values():
                continue
            player = player_map[pid]
            if pos not in player["eligible_positions"]:
                continue
            if pos == "P" and pos_hist[pid].count("P") >= 3:
                continue
            if pos == "C" and pos_hist[pid].count("C") >= 3:
                continue
            
            assignments[pos] = pid
            if assign(active_pids, positions_left, pos_idx + 1, inn, pos_hist, assignments):
                return True
            del assignments[pos]
        return False

    return solve_inn(1)

# Let's test adding RF or 2B to the restricted players
restricted_players = ["Audrey B (#11)", "Olivia B (#9)", "Scarlett S (#10)", "Sofia M (#7)", "Addy M (#3)"]
restricted_indices = [2, 7, 8, 9, 0] # indices in base_players

# We will try adding RF or 2B or LF/CF to some of these
options = [
    # (player_index, position_to_add)
    (2, "RF"), (7, "RF"), (8, "RF"), (9, "RF"), # Add RF to restricted outfielders
    (2, "2B"), (7, "2B"), (8, "2B"), (9, "2B"), # Add 2B to restricted infielders
    (0, "LF"), (0, "CF") # Add LF/CF to Addy M
]

print("Testing pairs of position additions:")
found = False
for opt1, opt2 in combinations(options, 2):
    if opt1[0] == opt2[0]:
        continue # Don't add two to the same player for now
    
    temp_players = [dict(x) for x in base_players]
    # Apply opt1
    p1_idx, pos1 = opt1
    temp_players[p1_idx]["eligible_positions"] = base_players[p1_idx]["eligible_positions"] + [pos1]
    # Apply opt2
    p2_idx, pos2 = opt2
    temp_players[p2_idx]["eligible_positions"] = base_players[p2_idx]["eligible_positions"] + [pos2]
    
    if test_config(temp_players):
        print(f" -> Success! Add {pos1} to {base_players[p1_idx]['name']} AND add {pos2} to {base_players[p2_idx]['name']}")
        found = True

if not found:
    print("No working pairs found.")
