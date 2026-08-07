import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.retriever import build_agent_executor

def main():
    # Instantiate the agent executor to get the tool references
    agent = build_agent_executor(coach_id=1, selected_team_id=5)
    
    # Find get_team_roster tool
    get_team_roster = next(tool for tool in agent.tools if tool.name == "get_team_roster")
    
    # Run the tool directly
    output = get_team_roster.invoke({"team_id": 5, "scope": "career"})
    print("Full Tool Output:")
    print("=================")
    print(output)

if __name__ == "__main__":
    main()
