import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lineup_generator import LineupGenerator, POSITIONS, INFIELD, OUTFIELD

class DiagnosticLineupGenerator(LineupGenerator):
    def _solve_inning(self, inning: int, bench_history: dict, position_history: dict, lineup: list) -> bool:
        if inning > self.innings_count:
            return True

        num_present = len(self.player_ids)
        num_bench = max(0, num_present - 9)
        sitting_candidates = self._get_bench_candidates(inning, bench_history)
        
        from itertools import combinations
        possible_bench_combos = list(combinations(sitting_candidates, num_bench))
        
        print(f"[Inning {inning}] {len(possible_bench_combos)} possible bench combinations from candidates: {[self.player_map[pid]['name'] for pid in sitting_candidates]}")
        
        for bench_combo in possible_bench_combos:
            # Check consecutive benching
            violates_consecutive = False
            for pid in bench_combo:
                if bench_history[pid] and bench_history[pid][-1] == inning - 1:
                    violates_consecutive = True
                    break
            if violates_consecutive:
                continue

            # Update bench history temporarily
            for pid in self.player_ids:
                if pid in bench_combo:
                    bench_history[pid].append(inning)
                else:
                    bench_history[pid].append(0)

            active_pids = [pid for pid in self.player_ids if pid not in bench_combo]
            assignments = {}
            if self._assign_positions(active_pids, POSITIONS, 0, inning, position_history, assignments):
                # Apply position history updates temporarily
                for pos, pid in assignments.items():
                    position_history[pid].append(pos)
                for pid in bench_combo:
                    position_history[pid].append("Bench")
                
                # Check end of 4th Inning check
                if inning == 4 and not self._verify_inf_out_rotation(position_history):
                    # Print diagnostics on why 4th inning check failed
                    print(f"  [Failed Inning 4 Rule] Infield/Outfield rotation check failed for this assignment:")
                    for pid in self.player_ids:
                        history = position_history[pid]
                        active_pos = [p for p in history if p != "Bench"]
                        has_inf = any(p in INFIELD for p in active_pos)
                        has_out = any(p in OUTFIELD for p in active_pos)
                        print(f"    - {self.player_map[pid]['name']}: {history} (Has Infield: {has_inf}, Has Outfield: {has_out})")
                    
                    self._backtrack_inning(bench_combo, assignments, bench_history, position_history, inning)
                    continue

                lineup.append({
                    "inning": inning,
                    "assignments": assignments,
                    "bench": list(bench_combo)
                })

                if self._solve_inning(inning + 1, bench_history, position_history, lineup):
                    return True
                
                lineup.pop()
                self._backtrack_inning(bench_combo, assignments, bench_history, position_history, inning)
            else:
                for pid in self.player_ids:
                    bench_history[pid].pop()
                    
        return False

def main():
    # Present players (Willow is absent)
    players_data = [
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

    print("Running diagnostic solver with 10 players...")
    generator = DiagnosticLineupGenerator(players_data, 6)
    result = generator.generate()
    if result.get("success"):
        print("Diagnostic solver generated a lineup successfully!")
    else:
        print(f"Diagnostic solver failed: {result.get('error')}")

if __name__ == "__main__":
    main()
