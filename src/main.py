from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, field_validator
from src.retriever import build_chain, build_agent_executor
from src.database import get_coach_by_email, authenticate_coach, register_coach, create_team, get_coach_teams, set_active_team, update_team, add_player, get_team_players, update_player_stats, delete_player, bulk_update_player_stats, check_is_head_coach, add_coach_to_team, get_db_connection, update_player_eligibility, save_team_lineup, get_team_lineups, delete_team_lineup, add_returning_player, get_coach_players_directory, get_team_coaches, search_players_global
from src.auth import get_current_coach, verify_team_ownership
from langchain_core.messages import HumanMessage, AIMessage
import json
from sse_starlette import EventSourceResponse

app = FastAPI(title = "🥎 Softball Coach AI API")

# Helper function validate softball fractional innings (decimal part must be .0, .1, or .2)
def check_innings_decimal(v: float) -> float:
    if v < 0:
        raise ValueError("Innings cannot be negative.")
    whole = int(v)
    fraction = round(v - whole, 1)
    if fraction not in (0.0, 0.1, 0.2):
        raise ValueError("Fractional innings must have a decimal part of .0, .1, or .2 (representing outs).")
    return v

# Enable CORS so Reach frontend running on local host can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                # local react dev server
        "https://softball-coach-ai.vercel.app", # old production react site
        "https://softball-coach.vercel.app"     # new production react site
    ],
    allow_origin_regex="https://softball-coach-.*\\.vercel\\.app", # allows any Vercel preview url
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Schemas (data validation rules)
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: EmailStr
    password: str
    coach_name: str
    location: str
    age_group: str

class GoogleLoginRequest(BaseModel):
    email: EmailStr
    display_name: str

class GoogleRegisterRequest(BaseModel):
    email: EmailStr
    coach_name: str
    location: str
    age_group: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    age_group: str
    coach_name: str
    location: str
    coach_id: int | None = None
    selected_team_id: int | None = None
    history: list[ChatMessage] | None = None

class TeamRequest(BaseModel):
    coach_id: int
    team_name: str
    season: str
    age_group: str
    innings_per_game: int = 7

class UpdateEligibilityRequest(BaseModel):
    eligible_positions: str

class SaveLineupRequest(BaseModel):
    game_date: str # YYY-MM-DD format
    opponent: str
    innings_count: int
    lineup_data: dict

class SetActiveRequest(BaseModel):
    coach_id: int

class TeamUpdateRequest(BaseModel):
    coach_id: int
    team_name: str
    season: str
    wins: int
    losses: int
    ties: int
    age_group: str
    is_active: bool
    innings_per_game: int = 7

class PlayerRequest(BaseModel):
    coach_id: int
    team_id: int
    player_name: str
    player_number: int
    batting_hand: str
    throwing_hand: str
    parent_player_id: int | None = None

class PlayerUpdateRequest(BaseModel):
    coach_id: int
    team_id: int
    player_name: str
    player_number: int
    batting_hand: str
    throwing_hand: str
    games_played: int
    parent_player_id: int | None = None
    eligible_positions: str | None = None
    plate_appearances: int
    at_bats: int
    singles: int
    doubles: int
    triples: int
    home_runs: int
    walks: int
    strikeouts: int
    hit_by_pitches: int
    stolen_bases: int
    caught_stealing: int
    runs_scored: int
    runs_batted_in: int
    reached_on_error: int = 0
    # Pitching stats
    games_pitched: int = 0
    games_started: int = 0
    innings_pitched: float = 0.0
    batters_faced: int = 0
    number_of_pitches: int = 0
    hits_allowed: int = 0
    runs_allowed: int = 0
    earned_runs: int = 0
    walks_allowed: int = 0
    strikeouts_thrown: int = 0
    hit_by_pitches_allowed: int = 0
    left_on_base: int = 0
    # Fielding stats (NEW)
    total_chances: int = 0
    assists: int = 0
    putouts: int = 0
    errors: int = 0
    # Catching stats (NEW)
    innings_caught: float = 0.0
    passed_balls_allowed: int = 0
    runners_stolen_bases: int = 0
    runners_caught_stealing: int = 0
    # Position innings stats (NEW)
    innings_p: float = 0.0
    innings_c: float = 0.0
    innings_1b: float = 0.0
    innings_2b: float = 0.0
    innings_3b: float = 0.0
    innings_ss: float = 0.0
    innings_lf: float = 0.0
    innings_cf: float = 0.0
    innings_rf: float = 0.0
    # field validator for PlayerUpdateRequest innings
    @field_validator(
        "innings_pitched", "innings_caught", "innings_p", "innings_c",
        "innings_1b", "innings_2b", "innings_3b", "innings_ss",
        "innings_lf", "innings_cf", "innings_rf"
    )
    @classmethod
    def validate_innings(cls, v: float) -> float:
        return check_innings_decimal(v)

class AddReturningPlayerRequest(BaseModel):
    coach_id: int
    team_id: int
    player_id: int
    player_number: int

class BulkImportPlayer(BaseModel):
    player_name: str
    player_number: int
    games_played: int
    plate_appearances: int
    at_bats: int
    singles: int
    doubles: int
    triples: int
    home_runs: int
    walks: int
    strikeouts: int
    hit_by_pitches: int
    stolen_bases: int
    caught_stealing: int
    runs_scored: int
    runs_batted_in: int
    reached_on_error: int = 0
    
    # Pitching stats
    games_pitched: int
    games_started: int
    innings_pitched: float
    batters_faced: int
    number_of_pitches: int
    hits_allowed: int
    runs_allowed: int
    earned_runs: int
    walks_allowed: int
    strikeouts_thrown: int
    hit_by_pitches_allowed: int
    left_on_base: int
    # Fielding stats (NEW)
    total_chances: int = 0
    assists: int = 0
    putouts: int = 0
    errors: int = 0
    # Catching stats (NEW)
    innings_caught: float = 0.0
    passed_balls_allowed: int = 0
    runners_stolen_bases: int = 0
    runners_caught_stealing: int = 0
    # Position innings stats (NEW)
    innings_p: float = 0.0
    innings_c: float = 0.0
    innings_1b: float = 0.0
    innings_2b: float = 0.0
    innings_3b: float = 0.0
    innings_ss: float = 0.0
    innings_lf: float = 0.0
    innings_cf: float = 0.0
    innings_rf: float = 0.0
    # field validator for BulkImportPlayer innings
    @field_validator(
        "innings_pitched", "innings_caught", "innings_p", "innings_c",
        "innings_1b", "innings_2b", "innings_3b", "innings_ss",
        "innings_lf", "innings_cf", "innings_rf"
    )
    @classmethod
    def validate_innings(cls, v: float) -> float:
        return check_innings_decimal(v)

class BulkImportRequest(BaseModel):
    coach_id: int
    team_id: int
    players: list[BulkImportPlayer]
 
class InviteCoachRequest(BaseModel):
    coach_id: int
    email: EmailStr
    role: str

# 2. Authentication API routes
@app.post("/api/auth/register")
def api_register(data: RegisterRequest):
    success = register_coach(
        data.username, data.password, data.coach_name, data.location, data.age_group
    )
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"message": "Account created successfully!"}

@app.post("/api/auth/login")
def api_login(data: LoginRequest):
    user = authenticate_coach(data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user

@app.post("/api/auth/google-login")
def api_google_login(data: GoogleLoginRequest):
    user = get_coach_by_email(data.email)
    if user:
        return {
            "registered": True,
            "user": user
        }
    return {
        "registered": False,
        "email": data.email
    }

@app.post("/api/auth/google-register")
def api_google_register(data: GoogleRegisterRequest):
    success = register_coach(
        username=data.email,
        password="GOOGLE_AUTH_DUMMY_PASSWORD",
        coach_name=data.coach_name,
        location=data.location,
        age_group=data.age_group
    )
    if not success:
        raise HTTPException(status_code=400, detail="Google registration failed")
    
    return get_coach_by_email(data.email)

# 3. AI RAG Chat Route (Streaming response)
chain = build_chain()

@app.post("/api/chat")
async def api_chat(data: ChatRequest, current_coach: dict = Depends(get_current_coach)):
    # Enforce request coach_id matches authenticated coach ID
    request_coach_id = data.coach_id if data.coach_id is not None else current_coach["id"]
    if request_coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")

    # Enforce selected team authorization if provided
    if data.selected_team_id:
        verify_team_ownership(data.selected_team_id, current_coach)

    profile_context = (
        f"Directly advising Coach {data.coach_name} based in {data.location}. "
        f"Tailor advice for competitive {data.age_group} fastpitch players."
    )

    # Parse and trim conversation history to the last 10 messages (5 turns)
    chat_history = []
    if data.history:
        recent_history = data.history[-10:]
        for msg in recent_history:
            if msg.role == "user":
                chat_history.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                chat_history.append(AIMessage(content=msg.content))

    async def event_generator():
        try:
            # Instantiate agent executor dynamically for the logged-in coach
            agent_executor = build_agent_executor(current_coach["id"], data.selected_team_id)
            
            # Use astream_events to capture both tool usage and final answer streaming
            async for event in agent_executor.astream_events(
                {"input": data.question, "chat_history": chat_history},
                version="v2"
            ):
                event_type = event["event"]
                name = event["name"]
                
                if event_type == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        yield {
                            "event": "message",
                            "data": json.dumps({"type": "token", "text": content})
                        }
                elif event_type == "on_tool_start":
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "tool_start", "tool": name})
                    }
                elif event_type == "on_tool_end":
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "tool_end", "tool": name})
                    }
        except Exception as e:
            # Fallback to the classic RAG chain if agent execution fails
            print(f"Agent execution failed, falling back to RAG chain: {e}")
            try:
                # Use astream_events for the fallback chain
                async for event in chain.astream_events(
                    {
                        "question": data.question,
                        "chat_history": chat_history,
                        "profile_context": profile_context
                    },
                    version="v2"
                ):
                    event_type = event["event"]
                    if event_type == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            yield {
                                "event": "message",
                                "data": json.dumps({"type": "token", "text": content})
                            }
                    elif event_type == "on_retriever_end":
                        yield {
                            "event": "message",
                            "data": json.dumps({"type": "tool_end", "tool": "search_playbook"})
                        }
            except Exception as fallback_err:
                print(f"Fallback RAG chain failed: {fallback_err}")
                yield {
                    "event": "error",
                    "data": json.dumps({"detail": str(fallback_err)})
                }
                
    return EventSourceResponse(event_generator())

# 4. Team Management API Routes
@app.post("/api/teams")
def api_create_team(data: TeamRequest, current_coach: dict = Depends(get_current_coach)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    try:
        new_team = create_team(current_coach["id"], data.team_name, data.season, data.age_group, data.innings_per_game)
        return new_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/teams/{coach_id}")
def api_get_teams(coach_id: int, current_coach: dict = Depends(get_current_coach)):
    if coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized access to this coach's teams.")
    try:
        teams = get_coach_teams(coach_id)
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/teams/{team_id}/active")
def api_set_active(team_id: int, data: SetActiveRequest, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    try:
        updated_team = set_active_team(current_coach["id"], team_id)
        if not updated_team:
            raise HTTPException(status_code=404, detail="Team not found or unauthorized.")
        return updated_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/teams/{team_id}")
def api_update_team(team_id: int, data: TeamUpdateRequest, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    try:
        updated = update_team(
            current_coach["id"], team_id, data.team_name, data.season,
            data.wins, data.losses, data.ties, data.age_group, data.is_active, data.innings_per_game
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Team not found or unauthorized.")
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/teams/{team_id}/coaches")
def api_invite_coach(team_id: int, data: InviteCoachRequest, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    # Verify the requester is a Head Coach
    if not check_is_head_coach(current_coach["id"], team_id):
        raise HTTPException(status_code=403, detail="Only a Head Coach can invite other coaches.")
    
    result = add_coach_to_team(team_id, data.email, data.role)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/api/teams/{team_id}/coaches")
def api_get_team_coaches(team_id: int, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    """Fetches and groups head and assistant coaches for a specific team."""
    try:
        coaches = get_team_coaches(team_id)
        head_coaches = [c["coach_name"] for c in coaches if c["role"] == "Head Coach"]
        assistant_coaches = [c["coach_name"] for c in coaches if c["role"] == "Assistant Coach"]

        return {
            "head_coaches": ", ".join(head_coaches) if head_coaches else "None",
            "assistant_coaches": ", ".join(assistant_coaches) if assistant_coaches else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Player Management API Routes
@app.post("/api/players")
def api_add_player(data: PlayerRequest, current_coach: dict = Depends(get_current_coach)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    # Verify the coach is associated with the target team
    verify_team_ownership(data.team_id, current_coach)
    try:
        new_player = add_player(current_coach["id"], data.team_id, data.player_name, data.player_number, data.batting_hand, data.throwing_hand, data.parent_player_id)
        if not new_player:
            raise HTTPException(status_code=500, detail="Failed to create player.")
        return new_player
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/players/directory")
def api_get_coach_players_directory(current_coach: dict = Depends(get_current_coach)):
    """Fetches a unique list of all players created by the coach across all teams."""
    try:
        return get_coach_players_directory(current_coach["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/players/search")
def api_search_players_global(query: str, current_coach: dict = Depends(get_current_coach)): 
    """Searches all players in the database globally by name."""
    if len(query.strip()) < 2:
        return []
    try:
        return search_players_global(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/players/{team_id}")
def api_get_roster(team_id: int, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    try:
        roster = get_team_players(team_id)
        return roster
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/players/{player_id}")
def api_update_player(player_id: int, data: PlayerUpdateRequest, current_coach: dict = Depends(get_current_coach)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    
    # Verify coach ownership of the target team submitted in request
    verify_team_ownership(data.team_id, current_coach)
    
    try:
        updated = update_player_stats(current_coach["id"], player_id, dict(data))
        if not updated:
            raise HTTPException(status_code=404, detail="Player not found.")
        return updated
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/players/{player_id}")
def api_delete_player(player_id: int, coach_id: int, team_id: int, current_coach: dict = Depends(get_current_coach)):
    if coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
        
    verify_team_ownership(team_id, current_coach)
    try:
        success = delete_player(current_coach["id"], player_id, team_id)
        if not success:
            raise HTTPException(status_code=404, detail="Player not found on this team.")
        return {"success": True}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/players/bulk-update")
def api_bulk_update_players(data: BulkImportRequest, current_coach: dict = Depends(get_current_coach)):
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    verify_team_ownership(data.team_id, current_coach)
    try:
        player_data = [dict(p) for p in data.players]
        updated = bulk_update_player_stats(current_coach["id"], data.team_id, player_data)
        return updated
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/players/returning")
def api_add_returning_player(data: AddReturningPlayerRequest, current_coach: dict = Depends(get_current_coach)):
    """Links an existing career player to a new team roster."""
    if data.coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
    verify_team_ownership(data.team_id, current_coach)
    try:
        result = add_returning_player(current_coach["id"], data.team_id, data.player_id, data.player_number)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to add returning player.")
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    
    
# 6. Google Auth Routes
@app.post("/api/auth/google-login")
def api_google_login(data: GoogleLoginRequest):
    user = get_coach_by_email(data.email)
    if user:
        return {
            "registered": True,
            "user": user
        }
    return {
        "registered": False,
        "email": data.email
    }

@app.post("/api/auth/google-register")
def api_google_register(data: GoogleRegisterRequest):
    success = register_coach(
        username=data.email,
        password="GOOGLE_AUTH_DUMMY_PASSWORD", # placeholder
        coach_name=data.coach_name,
        location=data.location,
        age_group=data.age_group
    )
    if not success:
        raise HTTPException(status_code=400, detail="Registration failed")
    
    return authenticate_coach(data.email, "GOOGLE_AUTH_DUMMY_PASSWORD")

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Softball Coach AI API"}

@app.put("/api/players/{player_id}/eligibility")
def api_update_eligibility(player_id: int, data: UpdateEligibilityRequest, current_coach: dict = Depends(get_current_coach)):
    # Verify player's team ownership
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT team_id FROM players WHERE id = %s LIMIT 1;", (player_id, ))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found.")
        team_id = row["team_id"]
    finally:
        cursor.close()
        conn.close()

    verify_team_ownership(team_id, current_coach)
    success = update_player_eligibility(player_id, data.eligible_positions)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update eligibility.")
    return {"success": True}

# Lineup generation endpoint removed

@app.post("/api/teams/{team_id}/lineups")
def api_save_lineup(team_id: int, data: SaveLineupRequest, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    lineup_id = save_team_lineup(team_id, current_coach["id"], data.game_date, data.opponent, data.innings_count, data.lineup_data)
    return {"success": True, "lineup_id": lineup_id}

@app.get("/api/teams/{team_id}/lineups")
def api_get_lineups(team_id: int, current_coach: dict = Depends(get_current_coach), role: str = Depends(verify_team_ownership)):
    lineups = get_team_lineups(team_id)
    return lineups

@app.delete("/api/lineups/{lineup_id}")
def api_delete_lineup(lineup_id: int, current_coach: dict = Depends(get_current_coach)):
    # Check ownership
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT team_id FROM lineups WHERE id = %s LIMIT 1;", (lineup_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lineup not found.")
        team_id = row["team_id"]
    finally:
        cursor.close()
        conn.close()
        
    verify_team_ownership(team_id, current_coach)
    delete_team_lineup(lineup_id)
    return {"success": True}
