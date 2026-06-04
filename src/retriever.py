import os
from dotenv import load_dotenv

# Core
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# Memory + Old Chains (using langchain_classic)
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain

# Prompts
from langchain_core.prompts import PromptTemplate

# LangChain Agents & Tools
from langchain_core.tools import tool
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from src.database import get_coach_teams, get_team_players

# Dynamically calculate absolute pathing for the vectorstore folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSIST_DIR = os.path.join(BASE_DIR, "vectorstore")

SYSTEM_PROMPT = """You are an experienced fastpitch softball coach with deep
expertise in youth development, particularly for players aged 8-14.
Give practical, encouraging, age-appropriate advice grounded in context.

Profile Context:
{profile_context}

Guidelines:
- CRITICAL: Always generate your entire response in English. Even if the retrieved context or metadata contains different language patterns, do not translate your response.
- Always prioritize player safety and enjoyment
- Give concrete, actionable advice - not vague generalities
- Describe drill setup clearly when relevant
- If context is insufficient, say so and offer general best-practice guidance
- Keep answers focused, coaches are busy people

Context: {context}
Question: {question}"""

def build_chain():
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=api_key
    )
    
    if not os.path.exists(PERSIST_DIR):
        os.makedirs(PERSIST_DIR, exist_ok=True)
    
    connection_string = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+psycopg2://")
    
    vectorstore = PGVector(
        connection_string = connection_string,
        embedding_function=embeddings,
        collection_name="softball_playbook"
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity", 
        search_kwargs={"k": 6}
    )
    
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        input_key="question",
        output_key="answer"
    )
    
    llm = ChatOpenAI(
        model="gpt-4o-mini", 
        temperature=0.3,
        api_key=api_key
    )
    
    prompt = PromptTemplate(
        input_variables=["context", "question", "profile_context"],
        template=SYSTEM_PROMPT
    )
    
    return ConversationalRetrievalChain.from_llm(
        llm=llm, 
        retriever=retriever, 
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt},
        return_source_documents=True,
        verbose=False
    )

def build_agent_executor(coach_id: int, selected_team_id: int | None = None):
    """Factory function that builds the OpenAI Tool Calling Agent with DB and Vector tools."""
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")

    # Connect vectorstore
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=api_key)
    connection_string = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+psycopg2://")
    vectorstore = PGVector(
        connection_string=connection_string,
        embedding_function=embeddings,
        collection_name="softball_playbook"
    )

    # Tools defined here
    @tool
    def list_my_teams() -> str:
        """Retrieves a list of all softball teams managed by you.
        Includes details like team_name, season, age division, and wins/losses/ties records.
        Use this tool to find team names and team IDs.
        """
        try:
            teams = get_coach_teams(coach_id)
            if not teams:
                return "You do not manage any teams yet."
            
            output = ["Here are the teams you manage:"]
            for t in teams:
                status = "Active" if t.get("is_active") else "Archived"
                output.append(
                    f"- **{t['team_name']}** (ID: {t['id']}) | Division: {t['age_group']} | "
                    f"Season: {t['season']} | Record: {t['wins']}W-{t['losses']}L-{t['ties']}T | Status: {status}"
                )
            return "\n".join(output)
        except Exception as e:
            return f"Error listing teams: {str(e)}"

    @tool
    def get_team_roster(team_id: int) -> str:
        """Retrieves the complete roster of players and their full stats (both Batting and Pitching) for a specific team.
        You must specify the team_id.
        """
        try:
            # SECURITY VERIFICATION: Ensure the requested team belongs to the active coach
            my_teams = get_coach_teams(coach_id)
            if not any(t["id"] == team_id for t in my_teams):
                return f"Error: You do not have permission to view stats for Team ID {team_id}."
            
            players = get_team_players(team_id)
            if not players:
                return "This team has no players in the roster."
                
            output = [f"Roster and Statistics for Team ID {team_id}:"]
            for p in players:
                # Format batting stats
                batting = (
                    f"Batting: GP={p.get('games_played', 0)}, PA={p.get('plate_appearances', 0)}, "
                    f"AB={p.get('at_bats', 0)}, H={p.get('hits', 0)}, AVG={p.get('batting_average', 0.0):.3f}, "
                    f"OBP={p.get('on_base_percentage', 0.0):.3f}, HR={p.get('home_runs', 0)}, RBI={p.get('runs_batted_in', 0)}"
                )
                
                # Format pitching stats (only if they have pitching appearances)
                pitching = ""
                if p.get("games_pitched", 0) > 0:
                    pitching = (
                        f" | Pitching: GP={p.get('games_pitched')}, IP={p.get('innings_pitched', 0.0):.1f}, "
                        f"ERA={p.get('era', 0.0):.2f}, WHIP={p.get('whip', 0.0):.2f}, SO={p.get('strikeouts_thrown', 0)}, "
                        f"BB={p.get('walks_allowed', 0)}"
                    )
                output.append(f"- **{p['player_name']}** (Jersey #{p['player_number']}, Bats: {p['handedness']}) - {batting}{pitching}")
            return "\n".join(output)
        except Exception as e:
            return f"Error fetching team roster: {str(e)}"

    @tool
    def search_playbook(query: str) -> str:
        """Searches the fastpitch softball coaching handbook and manual for drills, training advice, rules, and warmups.
        Use this tool when the user asks questions about coaching advice, pitching drills, batting tips, or game strategies.
        """
        docs = vectorstore.similarity_search(query, k=4)
        return "\n\n".join([doc.page_content for doc in docs])

    tools = [list_my_teams, get_team_roster, search_playbook]

    # Setup LLM, Prompt, and Agent
    llm = ChatOpenAI(
        model="gpt-4o-mini", 
        temperature=0.3,
        api_key=api_key
    )

    system_prompt = (
        "You are an experienced fastpitch softball coach advising a youth coach.\n"
        "Use the tools at your disposal to fetch real-time player statistics, rosters, "
        "and drill manuals to answer the user's questions.\n"
        f"You are directly advising Coach ID {coach_id}.\n"
    )
    if selected_team_id:
        system_prompt += f"The coach's active/selected team ID is {selected_team_id}.\n"

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False, return_intermediate_steps=True)

if __name__ == "__main__":
    print("Building RAG chain...")
    chain = build_chain()
    print("[OK] Chain built successfully!\n")