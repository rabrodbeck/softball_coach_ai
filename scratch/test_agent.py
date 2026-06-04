import sys
import os

# Add the project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.retriever import build_agent_executor

def test():
    print("Initializing agent executor for Coach 1...")
    # Coach 1 exists in the database
    executor = build_agent_executor(coach_id=1, selected_team_id=1)
    
    print("\nRunning a query that should trigger database lookup...")
    result = executor.invoke({
        "input": "Who is on my team with ID 1?",
        "chat_history": []
    })
    
    print("\n--- Agent Result ---")
    print("Output:", result.get("output"))
    print("\nIntermediate Steps:")
    for step in result.get("intermediate_steps", []):
        action, observation = step
        print(f"- Tool: {action.tool}")
        print(f"  Input: {action.tool_input}")
        print(f"  Output length: {len(str(observation))}")
        
    print("\nRunning a query that should trigger playbook search...")
    result_playbook = executor.invoke({
        "input": "Give me a good pitching warmup drill.",
        "chat_history": []
    })
    
    print("\n--- Playbook Result ---")
    print("Output:", result_playbook.get("output"))
    print("\nIntermediate Steps:")
    for step in result_playbook.get("intermediate_steps", []):
        action, observation = step
        print(f"- Tool: {action.tool}")
        print(f"  Input: {action.tool_input}")

if __name__ == "__main__":
    test()
