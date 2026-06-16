import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import POSITIONS, INFIELD, OUTFIELD
import random
from itertools import combinations

# Setup the 10 active players
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

def solve(disable_inf_out=False, disable_bench_limits=False, disable_pitcher_limits=False):
    bench_history = {pid: [] for pid in player_ids}
    position_history = {pid: [] for pid in player_ids}
    lineup = []

    def solve_inning(inning):
        if inning > 6:
            return True

        num_bench = 1
        # Get bench candidates
        sat_once_pids = {pid for pid, hist in bench_history.items() if any(x > 0 for x in hist)}
        all_sat_once = len(sat_once_pids) == len(player_ids)
        
        candidates = []
        for pid in player_ids:
            if not disable_bench_limits:
                if bench_history[pid] and bench_history[pid][-1] > 0:
                    continue # No consecutive bench
                if not all_sat_once and any(x > 0 for x in bench_history[pid]):
                    continue # Everyone sits once before anyone sits twice
            candidates.append(pid)

        possible_bench_combos = list(combinations(candidates, num_bench))
        for bench_combo in possible_bench_combos:
            for pid in player_ids:
                if pid in bench_combo:
                    bench_history[pid].append(inning)
                else:
                    bench_history[pid].append(0)

            active_pids = [pid for pid in player_ids if pid not in bench_combo]
            assignments = {}
            if assign_positions(active_pids, POSITIONS, 0, inning, position_history, assignments, disable_pitcher_limits):
                for pos, pid in assignments.items():
                    position_history[pid].append(pos)
                for pid in bench_combo:
                    position_history[pid].append("Bench")
                
                if inning == 4 and not disable_inf_out:
                    # Verify inf/out
                    ok = True
                    for pid, history in position_history.items():
                        active_pos = [pos for pos in history if pos != "Bench"]
                        has_infield = any(pos in INFIELD for pos in active_pos)
                        has_outfield = any(pos in OUTFIELD for pos in active_pos)
                        is_battery_exempt = (history.count("P") == 3 or history.count("C") == 3) and history[3] == "Bench" and len(player_ids) > 9
                        if not is_battery_exempt and (not has_infield or not has_outfield):
                            ok = False
                            break
                    if not ok:
                        # backtrack
                        for pid in player_ids:
                            bench_history[pid].pop()
                            position_history[pid].pop()
                        continue

                lineup.append({"inning": inning, "assignments": assignments, "bench": list(bench_combo)})
                if solve_inning(inning + 1):
                    return True
                lineup.pop()
                for pid in player_ids:
                    bench_history[pid].pop()
                    position_history[pid].pop()
            else:
                for pid in player_ids:
                    bench_history[pid].pop()

        return False

    def assign_positions(active_pids, positions_left, pos_idx, inning, position_history, assignments, disable_pitcher_limits):
        if pos_idx >= len(positions_left):
            return True
        pos = positions_left[pos_idx]
        for pid in active_pids:
            if pid in assignments.values():
                continue
            player = player_map[pid]
            if pos not in player["eligible_positions"]:
                continue
            if not disable_pitcher_limits:
                if pos == "P" and position_history[pid].count("P") >= 3:
                    continue
                if pos == "C" and position_history[pid].count("C") >= 3:
                    continue
            
            assignments[pos] = pid
            if assign_positions(active_pids, positions_left, pos_idx + 1, inning, position_history, assignments, disable_pitcher_limits):
                return True
            del assignments[pos]
        return False

    return solve_inning(1)

print("Diagnostic combinations:")
print("1. All rules enabled:", solve())
print("2. Disable Infield/Outfield rule:", solve(disable_inf_out=True))
print("3. Disable Bench limits (consecutive and equal sit):", solve(disable_bench_limits=True))
print("4. Disable Pitcher/Catcher max 3 limits:", solve(disable_pitcher_limits=True))
print("5. Disable Infield/Outfield AND Bench limits:", solve(disable_inf_out=True, disable_bench_limits=True))
