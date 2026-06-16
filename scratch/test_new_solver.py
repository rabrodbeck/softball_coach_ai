import sys
import os
import random

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

class CorrectedLineupGenerator:
    def __init__(self, players: list, innings_count: int):
        self.players = players
        self.innings_count = innings_count
        self.player_ids = [p["id"] for p in players]
        self.player_map = {p["id"]: p for p in players}

    def generate(self) -> dict:
        bench_history = {pid: [] for pid in self.player_ids}
        position_history = {pid: [] for pid in self.player_ids}
        lineup = []
        
        if not self._solve_inning(1, bench_history, position_history, lineup):
            return {"success": False, "error": "Could not generate a valid rotation meeting all rules."}
        
        return {"success": True, "innings": lineup}

    def _solve_inning(self, inning: int, bench_history: dict, position_history: dict, lineup: list) -> bool:
        if inning > self.innings_count:
            return True

        num_present = len(self.player_ids)
        num_bench = max(0, num_present - 9)
        sitting_candidates = self._get_bench_candidates(inning, bench_history)
        
        from itertools import combinations
        possible_bench_combos = list(combinations(sitting_candidates, num_bench))
        random.shuffle(possible_bench_combos)
        
        for bench_combo in possible_bench_combos:
            # Update bench history temporarily
            for pid in self.player_ids:
                if pid in bench_combo:
                    bench_history[pid].append(inning)
                else:
                    bench_history[pid].append(0)

            active_pids = [pid for pid in self.player_ids if pid not in bench_combo]
            assignments = {}
            
            if self._assign_and_solve(active_pids, POSITIONS, 0, inning, bench_combo, bench_history, position_history, assignments, lineup):
                return True
                
            for pid in self.player_ids:
                bench_history[pid].pop()
                
        return False

    def _assign_and_solve(self, active_pids: list, positions_left: list, pos_idx: int, inning: int, bench_combo: list, bench_history: dict, position_history: dict, assignments: dict, lineup: list) -> bool:
        if pos_idx >= len(positions_left):
            for pos, pid in assignments.items():
                position_history[pid].append(pos)
            for pid in bench_combo:
                position_history[pid].append("Bench")
            
            if inning == 4 and not self._verify_inf_out_rotation(position_history):
                for pid in self.player_ids:
                    position_history[pid].pop()
                return False

            lineup.append({
                "inning": inning,
                "assignments": dict(assignments),
                "bench": list(bench_combo)
            })

            if self._solve_inning(inning + 1, bench_history, position_history, lineup):
                return True
            
            lineup.pop()
            for pid in self.player_ids:
                position_history[pid].pop()
            return False

        pos = positions_left[pos_idx]
        shuffled_active = list(active_pids)
        random.shuffle(shuffled_active)
        
        for pid in shuffled_active:
            if pid in assignments.values():
                continue
                
            player = self.player_map[pid]
            if pos not in player["eligible_positions"]:
                continue
                
            if pos == "P" and position_history[pid].count("P") >= 3:
                continue
            if pos == "C" and position_history[pid].count("C") >= 3:
                continue

            if inning == 4:
                played_history = position_history[pid]
                is_starting_battery = played_history.count("P") == 3 or played_history.count("C") == 3
                if is_starting_battery and len(self.player_ids) <= 9 and pos in INFIELD:
                    continue

            assignments[pos] = pid
            if self._assign_and_solve(active_pids, positions_left, pos_idx + 1, inning, bench_combo, bench_history, position_history, assignments, lineup):
                return True
            del assignments[pos]
            
        return False

    def _get_bench_candidates(self, inning: int, bench_history: dict) -> list:
        sat_once_pids = {pid for pid, hist in bench_history.items() if any(x > 0 for x in hist)}
        all_sat_once = len(sat_once_pids) == len(self.player_ids)
        
        candidates = []
        for pid in self.player_ids:
            if bench_history[pid] and bench_history[pid][-1] > 0:
                continue
            if not all_sat_once and any(x > 0 for x in bench_history[pid]):
                continue
            candidates.append(pid)
        return candidates

    def _verify_inf_out_rotation(self, position_history: dict) -> bool:
        for pid, history in position_history.items():
            active_positions = [pos for pos in history if pos != "Bench"]
            has_infield = any(pos in INFIELD for pos in active_positions)
            has_outfield = any(pos in OUTFIELD for pos in active_positions)
            is_battery_exempt = (history.count("P") == 3 or history.count("C") == 3) and history[3] == "Bench" and len(self.player_ids) > 9
            if not is_battery_exempt and (not has_infield or not has_outfield):
                return False
        return True

def main():
    print("Running corrected solver...")
    generator = CorrectedLineupGenerator(players, 6)
    result = generator.generate()
    if result.get("success"):
        print("Success! Corrected solver generated a valid lineup:")
        for inn in result["innings"]:
            print(f"\nInning {inn['inning']}:")
            print(f"  Bench: {[next(p['name'] for p in players if p['id'] == bid) for bid in inn['bench']]}")
            for pos, pid in inn["assignments"].items():
                print(f"  {pos}: {next(p['name'] for p in players if p['id'] == pid)}")
    else:
        print(f"Corrected solver failed: {result.get('error')}")

if __name__ == "__main__":
    main()
