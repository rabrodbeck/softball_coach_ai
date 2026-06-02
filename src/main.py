from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from src.retriever import build_chain
from src.database import authenticate_coach, register_coach, create_team, get_coach_teams, set_active_team

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

class TeamRequest(BaseModel):
    coach_id: int
    team_name: str
    season: str
    age_group: str

class SetActiveRequest(BaseModel):
    coach_id: int

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

    # Simple non-streaming wrapper (or use EventSource/SSE for token streaming)
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
    
@app.get("api/teams/{coach_id}")
def api_get_teams(coach_id: int):
    try:
        teams = get_coach_teams(coach_id)
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("api/teams/{team_id}/active")
def api_set_active(team_id: int, data: SetActiveRequest):
    try:
        updated_team = set_active_team(data.coach_id, team_id)
        if not updated_team:
            raise HTTPException(status_code=404, detail="Team not found or unauthorized.")
        return updated_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))