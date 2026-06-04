import sys
import os

# Add the project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database import get_team_players, add_player

try:
    print("Testing get_team_players(3)...")
    players = get_team_players(3)
    print("Success! Player count:", len(players))
except Exception as e:
    import traceback
    print("Failed get_team_players(3) with error:")
    traceback.print_exc()

try:
    print("\nTesting add_player(3, 'Test Player', 99, 'Righty')...")
    player = add_player(3, 'Test Player', 99, 'Righty')
    print("Success! Created player ID:", player["id"])
except Exception as e:
    import traceback
    print("Failed add_player(3) with error:")
    traceback.print_exc()
