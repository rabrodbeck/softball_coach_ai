from fastapi.testclient import TestClient
from src.main import app
from src.auth import get_current_coach
from src.db.players import get_team_players

# Mock auth
app.dependency_overrides[get_current_coach] = lambda: {"id": 1, "username": "coach@example.com"}

client = TestClient(app)

# Case 1: team_id is None (from useTeamStore selectedTeamId being null)
p49 = next(p for p in get_team_players(6) if p["id"] == 49)

payload_null_team = {
    "coach_id": 1,
    "team_id": None, # <--- null!
    "player_name": p49["player_name"],
    "player_number": p49["player_number"],
    "batting_hand": "Left",
    "throwing_hand": p49["throwing_hand"],
    "eligible_positions": p49["eligible_positions"],
    "games_played": p49["games_played"],
    "plate_appearances": p49["plate_appearances"],
    "at_bats": p49["at_bats"],
    "singles": p49["singles"],
    "doubles": p49["doubles"],
    "triples": p49["triples"],
    "home_runs": p49["home_runs"],
    "walks": p49["walks"],
    "strikeouts": p49["strikeouts"],
    "hit_by_pitches": p49["hit_by_pitches"],
    "stolen_bases": p49["stolen_bases"],
    "caught_stealing": p49["caught_stealing"],
    "runs_scored": p49["runs_scored"],
    "runs_batted_in": p49["runs_batted_in"],
    "reached_on_error": p49["reached_on_error"],
    "games_pitched": p49["games_pitched"],
    "games_started": p49["games_started"],
    "innings_pitched": float(p49["innings_pitched"]),
    "batters_faced": p49["batters_faced"],
    "number_of_pitches": p49["number_of_pitches"],
    "hits_allowed": p49["hits_allowed"],
    "runs_allowed": p49["runs_allowed"],
    "earned_runs": p49["earned_runs"],
    "walks_allowed": p49["walks_allowed"],
    "strikeouts_thrown": p49["strikeouts_thrown"],
    "hit_by_pitches_allowed": p49["hit_by_pitches_allowed"],
    "left_on_base": p49["left_on_base"],
    "total_chances": p49["total_chances"],
    "assists": p49["assists"],
    "putouts": p49["putouts"],
    "errors": p49["errors"],
    "innings_caught": float(p49["innings_caught"]),
    "passed_balls_allowed": p49["passed_balls_allowed"],
    "runners_stolen_bases": p49["runners_stolen_bases"],
    "runners_caught_stealing": p49["runners_caught_stealing"],
}

resp1 = client.put("/api/players/49", json=payload_null_team)
print("Response with team_id=None:")
print("Status:", resp1.status_code)
print("Body:", resp1.json())

# Case 2: What if team_id=6 (valid team)?
payload_valid_team = dict(payload_null_team)
payload_valid_team["team_id"] = 6
resp2 = client.put("/api/players/49", json=payload_valid_team)
print("\nResponse with team_id=6:")
print("Status:", resp2.status_code)

# Case 3: What if innings_pitched or innings_caught has invalid decimal?
# e.g., if innings was 1.3 or something
payload_bad_innings = dict(payload_valid_team)
payload_bad_innings["innings_pitched"] = 1.3
resp3 = client.put("/api/players/49", json=payload_bad_innings)
print("\nResponse with innings_pitched=1.3:")
print("Status:", resp3.status_code)
print("Body:", resp3.json())
