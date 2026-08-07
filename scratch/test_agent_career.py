import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.retriever import build_agent_executor
from langchain_core.messages import HumanMessage
import asyncio

async def main():
    print("Building Agent Executor...")
    # Build agent for coach 1 and active team 5
    agent_executor = build_agent_executor(coach_id=1, selected_team_id=5)
    
    question = "Show me all players on my team that have more than 2 innings pitched in their career."
    print(f"Querying: '{question}'")
    
    # We can inspect events or print the steps
    try:
        async for event in agent_executor.astream_events(
            {"input": question, "chat_history": []},
            version="v2"
        ):
            event_type = event["event"]
            name = event["name"]
            
            if event_type == "on_tool_start":
                print(f"\n[TOOL START] {name} called with input: {event['data'].get('input')}")
            elif event_type == "on_tool_end":
                print(f"[TOOL END] {name} returned output (truncated): {str(event['data'].get('output'))[:300]}")
            elif event_type == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    sys.stdout.write(content)
                    sys.stdout.flush()
        print("\n\nExecution finished successfully.")
    except Exception as e:
        print(f"\nExecution failed with error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
