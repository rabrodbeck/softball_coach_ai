from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from src.retriever import build_chain
from src.database import authenticate_coach, register_coach

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