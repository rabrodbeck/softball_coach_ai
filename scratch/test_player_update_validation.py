from src.db.players import get_team_players
from src.main import PlayerUpdateRequest
from pydantic import ValidationError
import json

# Find which team player 49 is on
from src.db.pool import get_db_connection
conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT team_id, player_number, games_played FROM players_teams WHERE player_id = 49;")
pt = cur.fetchall()
print("players_teams for 49:", pt)

for row in pt:
    team_id = row['team_id']
    players = get_team_players(team_id)
    p49 = next((p for p in players if p['id'] == 49), None)
    print(f"\n--- Player 49 on Team {team_id} ---")
    if not p49:
        print("Player not found on team")
        continue

    # Now let's see what handleUpdatePlayerSubmit in frontend sends:
    frontend_payload = {
        "coach_id": 1, # hypothetical coach
        "team_id": team_id,
        "player_name": p49["player_name"],
        "player_number": p49["player_number"],
        "batting_hand": "Left", # edited batting hand
        "throwing_hand": p49["throwing_hand"],
        "eligible_positions": p49.get("eligible_positions"),
        "games_played": p49.get("games_played"),
        "plate_appearances": p49.get("plate_appearances"),
        "at_bats": p49.get("at_bats"),
        "singles": p49.get("singles"),
        "doubles": p49.get("doubles"),
        "triples": p49.get("triples"),
        "home_runs": p49.get("home_runs"),
        "walks": p49.get("walks"),
        "strikeouts": p49.get("strikeouts"),
        "hit_by_pitches": p49.get("hit_by_pitches"),
        "stolen_bases": p49.get("stolen_bases"),
        "caught_stealing": p49.get("caught_stealing"),
        "runs_scored": p49.get("runs_scored"),
        "runs_batted_in": p49.get("runs_batted_in"),
        "reached_on_error": p49.get("reached_on_error", 0),
        "games_pitched": p49.get("games_pitched"),
        "games_started": p49.get("games_started"),
        "innings_pitched": p49.get("innings_pitched"),
        "batters_faced": p49.get("batters_faced"),
        "number_of_pitches": p49.get("number_of_pitches"),
        "hits_allowed": p49.get("hits_allowed"),
        "runs_allowed": p49.get("runs_allowed"),
        "earned_runs": p49.get("earned_runs"),
        "walks_allowed": p49.get("walks_allowed"),
        "strikeouts_thrown": p49.get("strikeouts_thrown"),
        "hit_by_pitches_allowed": p49.get("hit_by_pitches_allowed"),
        "left_on_base": p49.get("left_on_base"),
        "total_chances": p49.get("total_chances"),
        "assists": p49.get("assists"),
        "putouts": p49.get("putouts"),
        "errors": p49.get("errors"),
        "innings_caught": p49.get("innings_caught"),
        "passed_balls_allowed": p49.get("passed_balls_allowed"),
        "runners_stolen_bases": p49.get("runners_stolen_bases"),
        "runners_caught_stealing": p49.get("runners_caught_stealing"),
    }
    print("Frontend payload keys:", list(frontend_payload.keys()))
    
    # Try validating with PlayerUpdateRequest
    try:
        req = PlayerUpdateRequest(**frontend_payload)
        print("Validation succeeded!")
    except ValidationError as e:
        print("Validation ERROR:")
        print(e.json())

cur.close()
conn.close()
