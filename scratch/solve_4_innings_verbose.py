import sys
import os
from itertools import combinations

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import POSITIONS, INFIELD, OUTFIELD

all_pos = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
players = [
    {"id": 1, "name": "Addy M (#3)", "eligible_positions": all_pos},
    {"id": 2, "name": "Anna T (#5)", "eligible_positions": all_pos},
    {"id": 3, "name": "Audrey B (#11)", "eligible_positions": all_pos},
    {"id": 4, "name": "Autumn L (#8)", "eligible_positions": all_pos},
    {"id": 5, "name": "Hannah L (#6)", "eligible_positions": all_pos},
    {"id": 6, "name": "Isabella V (#1)", "eligible_positions": all_pos},
    {"id": 7, "name": "Katherine M (#2)", "eligible_positions": all_pos},
    {"id": 8, "name": "Olivia B (#9)", "eligible_positions": all_pos},
    {"id": 9, "name": "Scarlett S (#10)", "eligible_positions": all_pos},
    {"id": 10, "name": "Sofia M (#7)", "eligible_positions": all_pos},
]
player_ids = [p["id"] for p in players]
player_map = {p["id"]: p for p in players}

def solve_verbose():
    bench_history = {pid: [] for pid in player_ids}
    position_history = {pid: [] for pid in player_ids}
    lineup = []

    def check_inf_out(pos_hist):
        failed_players = []
        for pid in player_ids:
            hist = pos_hist[pid]
            active = [p for p in hist if p != "Bench"]
            has_inf = any(p in INFIELD for p in active)
            has_out = any(p in OUTFIELD for p in active)
            is_battery_exempt = (hist.count("P") == 3 or hist.count("C") == 3) and hist[3] == "Bench"
            if not is_battery_exempt and (not has_inf or not has_out):
                failed_players.append((player_map[pid]["name"], hist, has_inf, has_out, is_battery_exempt))
        return failed_players

    def solve_inn(inn):
        if inn > 4:
            fails = check_inf_out(position_history)
            if not fails:
                return True
            # Log the near-misses
            if len(fails) <= 10:
                print(f"\nFirst failed board configuration at end of Inning 4! {len(fails)} player(s) failed:")
                for name, hist, has_inf, has_out, exempt in fails:
                    print(f"  - {name}: {hist} (Has Infield: {has_inf}, Has Outfield: {has_out}, Exempt: {exempt})")
                sys.exit(0) # Stop on first print to avoid flooding
            return False

        # Bench
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

                lineup.append(assignments)
                if solve_inn(inn + 1):
                    return True
                lineup.pop()

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

    solve_inn(1)

solve_verbose()
