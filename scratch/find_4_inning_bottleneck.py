import sys
import os
from itertools import combinations

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import POSITIONS, INFIELD, OUTFIELD

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
player_ids = [p["id"] for p in players]
player_map = {p["id"]: p for p in players}

def test_relaxation(exempt_pids=None):
    if exempt_pids is None:
        exempt_pids = set()
        
    bench_history = {pid: [] for pid in player_ids}
    position_history = {pid: [] for pid in player_ids}

    def check_inf_out(pos_hist):
        for pid in player_ids:
            if pid in exempt_pids:
                continue
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

print("Diagnostic: checking which player(s) if exempt from Infield/Outfield rule allow a solution:")
for p in players:
    print(f"Exempting {p['name']}: {test_relaxation({p['id']})}")

print("\nExempting pairs of players:")
for p1_idx in range(len(players)):
    for p2_idx in range(p1_idx + 1, len(players)):
        p1 = players[p1_idx]
        p2 = players[p2_idx]
        res = test_relaxation({p1["id"], p2["id"]})
        if res:
            print(f"Exempting both {p1['name']} and {p2['name']}: {res}")
