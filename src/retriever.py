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
from src.database import get_coach_teams, get_team_players, get_system_prompt

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

_vectorstore = None

def get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        load_dotenv()
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in environments.")
        
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=api_key
        )
        
        connection_string = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+psycopg2://")
        
        _vectorstore = PGVector(
            connection_string=connection_string,
            embedding_function=embeddings,
            collection_name="softball_playbook"
        )
    return _vectorstore

def build_chain():
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    
    vectorstore = get_vectorstore()

    retriever = vectorstore.as_retriever(
        search_type="mmr", 
        search_kwargs={"k": 4, "fetch_k": 10}
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
        combine_docs_chain_kwargs={"prompt": prompt},
        return_source_documents=True,
        verbose=False
    )

def build_agent_executor(coach_id: int, selected_team_id: int | None = None):
    """Factory function that builds the OpenAI Tool Calling Agent with DB and Vector tools."""
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in environments.")

    # Reuse global vectorstore
    vectorstore = get_vectorstore()

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
        """Retrieves the complete roster of players and their full stats (Batting, Pitching, Fielding, and Catching) for a specific team.
        You must specify the team_id.
        """
        try:
            my_teams = get_coach_teams(coach_id)
            matching_team = next((t for t in my_teams if t["id"] == team_id), None)
            if not matching_team:
                return f"Error: You do not have permission to view stats for Team ID {team_id}."
            
            # Read active role from query
            coach_role = matching_team.get("role", "Head Coach")
            team_name = matching_team["team_name"]
            players = get_team_players(team_id)
            if not players:
                return f"The team '{team_name}' has no players in the roster."
                
            output = [
                f"Roster and Statistics for '{team_name}' (Your Role: {coach_role}):",
                "NOTE: If your role is 'Assistant Coach', you have read-only access. You cannot perform operations like adding, editing, or deleting players.",
                "---"
            ]
            for p in players:
                # Format batting stats
                batting = (
                    f"Batting: GP={p.get('games_played', 0)}, PA={p.get('plate_appearances', 0)}, "
                    f"AB={p.get('at_bats', 0)}, H={p.get('hits', 0)}, AVG={p.get('batting_average', 0.0):.3f}, "
                    f"OBP={p.get('on_base_percentage', 0.0):.3f}, SLG={p.get('slugging_percentage', 0.0):.3f}, "
                    f"OPS={p.get('ops', 0.0):.3f}, ISO={p.get('isolated_power', 0.0):.3f}, "
                    f"BBK_Ratio={p.get('bb_k_ratio', 0.0):.2f}, SB_PCT={p.get('stolen_base_percentage', 0.0):.3f}, "
                    f"HR={p.get('home_runs', 0)}, RBI={p.get('runs_batted_in', 0)}, "
                    f"R={p.get('runs_scored', 0)}, BB={p.get('walks', 0)}, SO={p.get('strikeouts', 0)}, "
                    f"HBP={p.get('hit_by_pitches', 0)}, ROE={p.get('reached_on_error', 0)}, SB={p.get('stolen_bases', 0)}, CS={p.get('caught_stealing', 0)}, "
                    f"1B={p.get('singles', 0)}, 2B={p.get('doubles', 0)}, 3B={p.get('triples', 0)}"
                )
                
                # Format pitching stats (only if they have pitching appearances)
                pitching = ""
                if p.get("games_pitched", 0) > 0 and p.get("number_of_pitches", 0) > 0:
                    pitching = (
                        f" | Pitching: GamesPitched={p.get('games_pitched', 0)}, GamesStarted={p.get('games_started', 0)}, "
                        f"InningsPitched={p.get('innings_pitched', 0.0):.1f}, BattersFaced={p.get('batters_faced', 0)}, "
                        f"Pitches={p.get('number_of_pitches', 0)}, HitsAllowed={p.get('hits_allowed', 0)}, "
                        f"RunsAllowed={p.get('runs_allowed', 0)}, EarnedRuns={p.get('earned_runs', 0)}, "
                        f"WalksAllowed={p.get('walks_allowed', 0)}, StrikeoutsThrown={p.get('strikeouts_thrown', 0)}, "
                        f"HitBatters={p.get('hit_by_pitches_allowed', 0)}, LeftOnBase={p.get('left_on_base', 0)}, "
                        f"ERA={p.get('era', 0.0):.2f}, WHIP={p.get('whip', 0.0):.2f}, "
                        f"K7={p.get('k7', 0.0):.2f}, BB7={p.get('bb7', 0.0):.2f}, "
                        f"PitchesPerInning={p.get('pitches_per_inning', 0.0):.1f}, KtoBBRatio={p.get('k_bb_ratio', 0.0):.2f}"
                    )
                
                # Format fielding stats
                fielding = (
                    f" | Fielding: TC={p.get('total_chances', 0)}, PO={p.get('putouts', 0)}, "
                    f"A={p.get('assists', 0)}, E={p.get('errors', 0)}, FPCT={p.get('fielding_percentage', 0.0):.3f}"
                )
                
                # Format catching stats (only if they have caught innings)
                catching = ""
                if p.get("innings_caught", 0.0) > 0:
                    catching = (
                        f" | Catching: InningsCaught={p.get('innings_caught', 0.0):.1f}, PB={p.get('passed_balls_allowed', 0)}, "
                        f"SBA={p.get('runners_stolen_bases', 0)}, CS={p.get('runners_caught_stealing', 0)}, "
                        f"CS_PCT={p.get('caught_stealing_percentage', 0.0):.3f}"
                    )
                
                # Format position innings stats (NEW)
                pos_list = []
                for pos_name, key in [("P", "innings_p"), ("C", "innings_c"), ("1B", "innings_1b"), ("2B", "innings_2b"), ("3B", "innings_3b"), ("SS", "innings_ss"), ("LF", "innings_lf"), ("CF", "innings_cf"), ("RF", "innings_rf")]:
                    val = p.get(key, 0.0)
                    if val > 0:
                        pos_list.append(f"{pos_name}={val:.1f}")
                pos_innings = ""
                if pos_list:
                    pos_innings = f" | PositionInnings: {', '.join(pos_list)}"
                
                eligible_pos = p.get('eligible_positions') or 'P,C,1B,2B,3B,SS,LF,CF,RF'
                eligible_str = f" | EligiblePositions: {eligible_pos}"
                
                output.append(f"- **{p['player_name']}** (Jersey #{p['player_number']}, Bats: {p.get('batting_hand', 'Right')}, Throws: {p.get('throwing_hand', 'Right')}) - {batting}{pitching}{fielding}{catching}{pos_innings}{eligible_str}")
            return "\n".join(output)
        except Exception as e:
            return f"Error fetching team roster: {str(e)}"

    @tool
    def search_playbook(query: str) -> str:
        """Searches the fastpitch softball coaching handbook and manual for drills, training advice, rules, and warmups.
        Use this tool when the user askes questions about coaching advice, pitching drills, batting tips, fielding drills, baserunning drills, or game strategies.
        """
        docs = vectorstore.max_marginal_relevance_search(query, k=4, fetch_k=10)
        return "\n\n".join([doc.page_content for doc in docs])

    tools = [list_my_teams, get_team_roster, search_playbook]

    # Setup LLM, Prompt, and Agent
    llm = ChatOpenAI(
        model="gpt-4o-mini", 
        temperature=0.3,
        api_key=api_key
    )

    # Original fallback content if the database query is unavailable
    FALLBACK_SYSTEM_PROMPT = """You are an experienced fastpitch softball coach advising a youth coach.
Use the tools at your disposal to fetch real-time player statistics, rosters, and drill manuals to answer the user's questions.
You are directly advising Coach ID {{coach_id}}.
{{active_team_context}}

IMPORTANT STATISTICAL NOTES FOR THE AI AGENT:
1. In player rosters and stats returned by tools, the 'PositionInnings' section lists innings played by each player at specific positions: P (Pitcher), C (Catcher), 1B (First Base), 2B (Second Base), 3B (Third Base), SS (Shortstop), LF (Left Field), CF (Center Field), and RF (Right Field).
2. These innings follow standard baseball/softball fractional notation: the integer part represents full innings, and the decimal part represents partial outs (e.g., .1 means 1 out, .2 means 2 outs).
3. To compare two innings values accurately, convert them to total outs:
   - Multiply the integer (whole) number of innings by 3.
   - Add the decimal value (e.g., .1 adds 1, .2 adds 2, .0 adds 0).
   - Example: 9.1 is 9 * 3 + 1 = 28 outs. 9.0 is 9 * 3 + 0 = 27 outs. Therefore, 9.1 is greater than 9.0.
   - Example: 2.1 is 2 * 3 + 1 = 7 outs. 2.2 is 2 * 3 + 2 = 8 outs. Therefore, 2.1 is less than 2.2.
   Before answering questions about who has played the most/least or which position has the most/least innings, calculate the total outs for each player/position to make sure you determine the correct minimum/maximum.
4. Keep these position stats in mind when helping coaches analyze lineup options, position depth, and rotations.

5. POSITION ELIGIBILITY:
   - The 'EligiblePositions' section lists a comma-separated list of positions a player is eligible to play.
   - If a user asks "Who can play position X?" or "Who can X for me tonight?" (where X is Pitcher/P, Catcher/C, 1B, 2B, 3B, SS, LF, CF, or RF), scan each player's 'EligiblePositions' and list all players who have X in their eligibility list.
   - If a user asks "What positions can player Y play?" or "Where is Y eligible?", check player Y's 'EligiblePositions' list and return those positions.

6. ACCESS PERMISSIONS & USER ROLES:
   - Pay attention to the active coach's role in the roster output (Head Coach or Assistant Coach).
   - If they are an 'Assistant Coach' and ask you to perform a modification (e.g. 'delete Sarah', 'add a new player', 'update stats'), politely remind them that their account has Read-Only (Assistant Coach) privileges on this team. Explain that they can analyze data, run lineups, and search playbook strategies, but must contact the Head Coach to execute changes."""

    # 1. Fetch prompt template dynamically
    raw_prompt = get_system_prompt("agent_system_prompt", FALLBACK_SYSTEM_PROMPT)

    # 2. Build active team context line
    active_team_context = f"The coach's active/selected team ID is {selected_team_id}." if selected_team_id else ""

    # 3. Format placeholders at runtime
    system_prompt = raw_prompt.format(
        coach_id=coach_id,
        active_team_context=active_team_context
    )


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