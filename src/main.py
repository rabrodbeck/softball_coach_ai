from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from src.retriever import build_chain, build_agent_executor
from src.database import authenticate_coach, register_coach, create_team, get_coach_teams, set_active_team, update_team, add_player, get_team_players, update_player_stats, delete_player, bulk_update_player_stats

app = FastAPI(title = "🥎 Softball Coach AI API")

# Enable CORS so Reach frontend running on local host can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                # local react dev server
        "https://softball-coach-ai.vercel.app"  # production react site
    ],
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

class PlayerRequest(BaseModel):
    team_id: int
    player_name: str
    player_number: int
    handedness: str
    parent_player_id: int | None = None

class PlayerUpdateRequest(BaseModel):
    player_name: str
    player_number: int
    handedness: str
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

class BulkImportRequest(BaseModel):
    team_id: int
    players: list[BulkImportPlayer]

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

# 3. AI RAG Chat Route (Streaming response)
chain = build_chain()

@app.post("/api/chat")
def api_chat(data: ChatRequest):
    profile_context = (
        f"Directly advising Coach {data.coach_name} based in {data.location}. "
        f"Tailor advice for competitive {data.age_group} fastpitch players."
    )

    if data.coach_id is not None:
        try:
            # Instantiate agent executor dynamically for the logged-in coach
            agent_executor = build_agent_executor(data.coach_id, data.selected_team_id)
            
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
            pass

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
def api_create_team(data: TeamRequest):
    try:
        new_team = create_team(data.coach_id, data.team_name, data.season, data.age_group)
        return new_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/teams/{coach_id}")
def api_get_teams(coach_id: int):
    try:
        teams = get_coach_teams(coach_id)
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/teams/{team_id}/active")
def api_set_active(team_id: int, data: SetActiveRequest):
    try:
        updated_team = set_active_team(data.coach_id, team_id)
        if not updated_team:
            raise HTTPException(status_code=404, detail="Team not found or unauthorized.")
        return updated_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/teams/{team_id}")
def api_update_team(team_id: int, data: TeamUpdateRequest):
    try:
        updated = update_team(
            data.coach_id, team_id, data.team_name, data.season,
            data.wins, data.losses, data.ties, data.age_group, data.is_active
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Team not found or unauthorized.")
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# 5. Player Management API Routes
@app.post("/api/players")
def api_add_player(data: PlayerRequest):
    try:
        new_player = add_player(data.team_id, data.player_name, data.player_number, data.handedness)
        if not new_player:
            raise HTTPException(status_code=500, detail="Failed to create player.")
        return new_player
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/players/{team_id}")
def api_get_roster(team_id: int):
    try:
        roster = get_team_players(team_id)
        return roster
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/players/{player_id}")
def api_update_player(player_id: int, data: PlayerUpdateRequest):
    try:
        updated = update_player_stats(player_id, dict(data))
        if not updated:
            raise HTTPException(status_code=404, detail="Player not found.")
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/players/{player_id}")
def api_delete_player(player_id: int):
    try:
        success = delete_player(player_id)
        if not success:
            raise HTTPException(status_code=404, detail="Player not found.")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/players/bulk-update")
def api_bulk_update_players(data: BulkImportRequest):
    try:
        player_data = [dict(p) for p in data.players]
        updated = bulk_update_player_stats(data.team_id, player_data)
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
