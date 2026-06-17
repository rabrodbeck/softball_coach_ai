import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import PlayerUpdateRequest

print("Testing Valid Innings (29.2)...")
try:
    # Test valid input (29.2 IP - 29 innings and 2 outs)
    data = {
        "coach_id": 1,
        "player_name": "Olivia B",
        "player_number": 9,
        "batting_hand": "Right",
        "throwing_hand": "Right",
        "games_played": 15,
        "plate_appearances": 50,
        "at_bats": 45,
        "singles": 10,
        "doubles": 2,
        "triples": 1,
        "home_runs": 1,
        "walks": 5,
        "strikeouts": 8,
        "hit_by_pitches": 0,
        "stolen_bases": 3,
        "caught_stealing": 0,
        "runs_scored": 12,
        "runs_batted_in": 10,
        "innings_pitched": 29.2,  # Valid
        "innings_caught": 0.0
    }
    PlayerUpdateRequest(**data)
    print("✅ Success! Valid innings passed validation.")
except Exception as e:
    print(f"❌ Error: Valid input failed validation: {e}")

print("\nTesting Invalid Innings (29.3)...")
try:
    # Test invalid input (29.3 IP - 3 outs is an extra whole inning, invalid fractional format)
    data["innings_pitched"] = 29.3
    PlayerUpdateRequest(**data)
    print("❌ Failure: Invalid innings passed validation!")
except ValueError as e:
    print(f"✅ Success! Invalid innings correctly blocked: {e}")

print("\nTesting Negative Innings (-1.1)...")
try:
    data["innings_pitched"] = -1.1
    PlayerUpdateRequest(**data)
    print("❌ Failure: Negative innings passed validation!")
except ValueError as e:
    print(f"✅ Success! Negative innings correctly blocked: {e}")