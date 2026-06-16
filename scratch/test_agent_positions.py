import sys
import os

# Add the project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.retriever import build_agent_executor

def test():
    print("Initializing agent executor for Coach 1, Team 2 (Tigers)...")
    # Coach 1 manages the Tigers (Team ID: 2)
    executor = build_agent_executor(coach_id=1, selected_team_id=2)
    
    queries = [
        "Who can pitch for me tonight?",
        "What positions can Addy play?",
        "Which player has played the most at first base?"
    ]
    
    for q in queries:
        print(f"\n======================================")
        print(f"Running Query: '{q}'")
        print(f"======================================")
        result = executor.invoke({
            "input": q,
            "chat_history": []
        })
        print("\n--- Agent Result ---")
        print("Output:", result.get("output"))
        print("\nIntermediate Steps:")
        for step in result.get("intermediate_steps", []):
            action, observation = step
            print(f"- Called Tool: {action.tool}")
            print(f"  Input parameters: {action.tool_input}")

if __name__ == "__main__":
    test()
