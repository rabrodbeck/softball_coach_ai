import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import set_active_team

print("Import successful! Testing set_active_team(1, 2)...")

try:
    result = set_active_team(1, 2)
    print("set_active_team successful! Result:", result)
except Exception as e:
    import traceback
    print("\n❌ ERROR IN set_active_team:")
    traceback.print_exc()
