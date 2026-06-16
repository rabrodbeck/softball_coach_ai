import random

POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
INFIELD = {"P", "C", "1B", "2B", "3B", "SS"}
OUTFIELD = {"LF", "CF", "RF"}

class LineupGenerator:
    def __init__(self, players: list, innings_count: int):
        """
        players: list of dicts: [
            {"id": 1, "name": "Olivia B", "eligible_positions": ["P", "2B", "LF", "RF"]}
        ]
        """
        self.players = players
        self.innings_count = innings_count
        self.player_ids = [p["id"] for p in players]
        self.player_map = {p["id"]: p for p in players}

    def generate(self) -> dict:
        """
        Generates a lineup matching all constraints.
        Returns:
            {
                "innings": [
                    { "inning": 1, "assignments": { "P": 1, "C": 2, ... }, "bench": [10, 11] }
                ]
            }
        """
        # Initialize tracking histories
        bench_history = {pid: [] for pid in self.player_ids} # pid -> list of innings they sat
        position_history = {pid: [] for pid in self.player_ids} # pid -> list of positions played
        
        lineup = []
        
        if not self._solve_inning(1, bench_history, position_history, lineup):
            return {"success": False, "error": "Could not generate a valid rotation meeting all rules with the current eligibility settings."}
        
        return {"success": True, "innings": lineup}

    def _solve_inning(self, inning: int, bench_history: dict, position_history: dict, lineup: list) -> bool:
        if inning > self.innings_count:
            return True

        # 1. Determine who MUST sit this inning
        num_present = len(self.player_ids)
        num_bench = max(0, num_present - 9)
        
        sitting_candidates = self._get_bench_candidates(inning, bench_history)
        
        # We need to pick 'num_bench' players to sit this inning
        # Let's try combinations of benched players
        from itertools import combinations
        possible_bench_combos = list(combinations(sitting_candidates, num_bench))
        # Shuffle combos for variability
        random.shuffle(possible_bench_combos)
        
        for bench_combo in possible_bench_combos:
            # Check Constraint: No girl can sit twice in a row
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
                    bench_history[pid].append(0) # 0 means active

            # 2. Get active players
            active_pids = [pid for pid in self.player_ids if pid not in bench_combo]
            
            # 3. Assign positions for active players
            assignments = {}
            if self._assign_positions(active_pids, POSITIONS, 0, inning, position_history, assignments):
                # Apply position history updates temporarily
                for pos, pid in assignments.items():
                    position_history[pid].append(pos)
                for pid in bench_combo:
                    position_history[pid].append("Bench")
                
                # Check rules that evaluate at intermediate points (e.g. End of 4th Inning check)
                if inning == 4 and not self._verify_inf_out_rotation(position_history):
                    # Backtrack position history updates
                    self._backtrack_inning(bench_combo, assignments, bench_history, position_history, inning)
                    continue

                # Prepare Inning Output
                lineup.append({
                    "inning": inning,
                    "assignments": assignments,
                    "bench": list(bench_combo)
                })

                # Proceed to next inning
                if self._solve_inning(inning + 1, bench_history, position_history, lineup):
                    return True
                
                # Backtrack next inning failure
                lineup.pop()
                self._backtrack_inning(bench_combo, assignments, bench_history, position_history, inning)
            else:
                # Backtrack bench combo
                for pid in self.player_ids:
                    bench_history[pid].pop()
                    
        return False

    def _backtrack_inning(self, bench_combo, assignments, bench_history, position_history, inning):
        for pid in self.player_ids:
            bench_history[pid].pop()
            position_history[pid].pop()

    def _get_bench_candidates(self, inning: int, bench_history: dict) -> list:
        # Rules:
        # 1. Cannot sit twice in a row
        # 2. Cannot sit twice before everyone has sat once
        # Let's count how many times everyone has sat
        sat_once_pids = {pid for pid, hist in bench_history.items() if any(x > 0 for x in hist)}
        all_sat_once = len(sat_once_pids) == len(self.player_ids)
        
        candidates = []
        for pid in self.player_ids:
            # 1. Did they sit last inning?
            if bench_history[pid] and bench_history[pid][-1] > 0:
                continue # Cannot sit consecutive innings
            
            # 2. Have they sat already, while someone else hasn't?
            if not all_sat_once and any(x > 0 for x in bench_history[pid]):
                continue # Save this person from sitting until everyone else has sat once
                
            candidates.append(pid)
        return candidates

    def _assign_positions(self, active_pids: list, positions_left: list, pos_idx: int, inning: int, position_history: dict, assignments: dict) -> bool:
        if pos_idx >= len(positions_left):
            return True
        
        pos = positions_left[pos_idx]
        
        # Find all active players eligible for this position
        for pid in active_pids:
            if pid in assignments.values():
                continue # already assigned this inning
                
            # Rule: Must be in player's eligible positions list
            player = self.player_map[pid]
            if pos not in player["eligible_positions"]:
                continue
                
            # Rule: Pitcher max 3 innings
            if pos == "P" and position_history[pid].count("P") >= 3:
                continue
                
            # Rule: Catcher max 3 innings
            if pos == "C" and position_history[pid].count("C") >= 3:
                continue

            # Rule: Starting Pitcher/Catcher exception for Infield/Outfield rotation check in Inning 4
            if inning == 4:
                played_history = position_history[pid]
                has_infield = any(p in INFIELD for p in played_history) or pos in INFIELD
                has_outfield = any(p in OUTFIELD for p in played_history) or pos in OUTFIELD
                
                # Starting Pitcher/Catcher exception: if they pitched/caught 3 innings, they play Outfield in 4th (if <= 9 girls)
                is_starting_battery = played_history.count("P") == 3 or played_history.count("C") == 3
                if is_starting_battery and len(self.player_ids) <= 9 and pos in INFIELD:
                    continue # Must play outfield in the 4th inning

            # Assign position temporarily
            assignments[pos] = pid
            
            if self._assign_positions(active_pids, positions_left, pos_idx + 1, inning, position_history, assignments):
                return True
                
            # Backtrack assignment
            del assignments[pos]
            
        return False

    def _verify_inf_out_rotation(self, position_history: dict) -> bool:
        """Every player must play at least 1 Infield and 1 Outfield position by the end of Inning 4."""
        for pid, history in position_history.items():
            # Filter out bench innings
            active_positions = [pos for pos in history if pos != "Bench"]
            has_infield = any(pos in INFIELD for pos in active_positions)
            has_outfield = any(pos in OUTFIELD for pos in active_positions)
            
            # Starting Pitcher/Catcher Exception (with > 9 players):
            # If they pitched/caught 3 of the first 4 innings and sat the 4th, they are exempt from Outfield until Inning 5
            is_battery_exempt = (history.count("P") == 3 or history.count("C") == 3) and history[3] == "Bench" and len(self.player_ids) > 9
            
            if not is_battery_exempt and (not has_infield or not has_outfield):
                return False
        return True