# 🥎 Softball Coach AI

An intelligent coaching copilot and team management workspace for fastpitch softball coaches. Built with React, TypeScript, FastAPI, PostgreSQL (PGVector), and LangChain.

---

## 📁 Repository Structure

```text
softball_coach_ai/
├── backend/                       # Python FastAPI backend & Docker container context
│   ├── src/                       # API routes, LangChain agent, database pool
│   ├── data/                      # Playbook PDFs, local league rules, practice plans
│   ├── database/                  # SQL schemas & migration files
│   ├── Dockerfile                 # Container image for Hugging Face Spaces
│   ├── requirements.txt           # Python dependencies
│   └── ...
│
├── frontend/                      # React 19 + TypeScript Single Page App (Vite)
│   ├── src/                       # Components, Zustand stores, custom hooks
│   ├── package.json
│   └── ...
│
├── docs/                          # Project roadmaps, architecture docs, and offline guides
│   ├── architecture/              # Agent architecture & vector store documentation
│   ├── roadmaps/                  # Migration plans and roadmap docs
│   ├── interview_prep/            # Engineering & interview guides
│   └── samples/                   # Sample game CSV exports
│
└── .github/workflows/             # CI/CD and keep-alive workflows
    ├── keep_alive.yml             # Health check pinger for Hugging Face
    └── deploy_hf.yml              # Automated sync of backend/ to Hugging Face Spaces
```

---

## 🚀 Local Development

### 1. Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: ..\venv\Scripts\activate

# Run backend development server
uvicorn src.main:app --reload --port 8000
```
* API will be live at `http://localhost:8000`
* Interactive API docs: `http://localhost:8000/docs`

### 2. Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run frontend development server
npm run dev
```
* Web app will be live at `http://localhost:5173`

---

## 🌐 Deployments

* **Frontend**: Hosted on [Vercel](https://vercel.com/) (Root directory set to `frontend`).
* **Backend**: Hosted on [Hugging Face Spaces](https://huggingface.co/spaces/rbrodbeck/softball-coach-ai) (Docker on port 7860). Pushing to GitHub `main` automatically deploys `backend/` to Hugging Face Spaces via GitHub Actions.