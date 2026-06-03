import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import update_team

print("Import successful! Testing update_team(1, 3, ...)...")

try:
    result = update_team(
        coach_id=1,
        team_id=3,
        team_name="Lady Hawks Test",
        season="Spring 2026",
        wins=0,
        losses=0,
        ties=0,
        age_group="12U Division",
        is_active=True
    )
    print("update_team successful! Result:", result)
except Exception as e:
    import traceback
    print("\n❌ ERROR IN update_team:")
    traceback.print_exc()
