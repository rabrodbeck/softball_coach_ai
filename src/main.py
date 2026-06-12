from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from src.retriever import build_chain, build_agent_executor
from src.database import get_coach_by_email, authenticate_coach, register_coach, create_team, get_coach_teams, set_active_team, update_team, add_player, get_team_players, update_player_stats, delete_player, bulk_update_player_stats, check_is_head_coach, add_coach_to_team, get_db_connection
from src.auth import get_current_coach, verify_team_ownership

app = FastAPI(title = "🥎 Softball Coach AI API")

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

class ChatRequest(BaseModel):
    question: str
    age_group: str
    coach_name: str
    location: str
    coach_id: int | None = None
    selected_team_id: int | None = None

class TeamRequest(BaseModel):
    coach_id: int
    team_name: str
    season: str
    age_group: str
    innings_per_game: int = 7

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
    player_name: str
    player_number: int
    batting_hand: str
    throwing_hand: str
    games_played: int
    parent_player_id: int | None = None
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
def api_chat(data: ChatRequest, current_coach: dict = Depends(get_current_coach)):
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

    try:
        # Instantiate agent executor dynamically for the logged-in coach
        agent_executor = build_agent_executor(current_coach["id"], data.selected_team_id)
        
        result = agent_executor.invoke({
            "input": data.question,
            "chat_history": []
        })
        
        # Extract source documents from intermediate steps if search_playbook was called
        sources = []
        if "intermediate_steps" in result:
            for action, observation in result["intermediate_steps"]:
                if action.tool == "search_playbook":
                    sources.append("softball_playbook")
        
        return {
            "answer": result["output"],
            "sources": list(set(sources))
        }
    except Exception as e:
        # Fallback to the classic RAG chain if agent execution fails
        print(f"Agent execution failed, falling back to RAG chain: {e}")
        
        # Simple non-streaming wrapper fallback
        result = chain.invoke({
            "question": data.question,
            "profile_context": profile_context
        })
        return {
            "answer": result["answer"],
            "sources": [doc.metadata.get("source", "Unknown").split('/')[-1] for doc in result.get("source_documents", [])]
        }

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
    
    # Retrieve the player's team_id to verify coach ownership
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT team_id FROM players WHERE id = %s LIMIT 1;", (player_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found.")
        team_id = row["team_id"]
    finally:
        cursor.close()
        conn.close()
        
    verify_team_ownership(team_id, current_coach)
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
def api_delete_player(player_id: int, coach_id: int, current_coach: dict = Depends(get_current_coach)):
    if coach_id != current_coach["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized coach ID.")
        
    # Retrieve the player's team_id to verify coach ownership
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT team_id FROM players WHERE id = %s LIMIT 1;", (player_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found.")
        team_id = row["team_id"]
    finally:
        cursor.close()
        conn.close()
        
    verify_team_ownership(team_id, current_coach)
    try:
        success = delete_player(current_coach["id"], player_id)
        if not success:
            raise HTTPException(status_code=404, detail="Player not found.")
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
    
# 5. Google Auth Routes
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
