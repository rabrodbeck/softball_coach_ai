import json
import os

log_path = r"C:\Users\Ryan\.gemini\antigravity\brain\cfb05b62-dbd5-4abd-a2d1-ff67abcc5d50\.system_generated\logs\transcript.jsonl"

def search():
    if not os.path.exists(log_path):
        print("Log path does not exist.")
        return
    
    print("Searching logs...")
    keywords = ["hugging", "sleep", "awake", "cron", "uptime", "ping"]
    matches = []
    
    with open(log_path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                content = str(data.get("content", "")) + " " + str(data.get("tool_calls", ""))
                if any(k in content.lower() for k in keywords):
                    # Save a snippet of the line
                    matches.append((idx, data.get("source"), data.get("type"), content[:300]))
            except Exception as e:
                pass
                
    print(f"Found {len(matches)} matching lines:")
    for idx, source, step_type, snippet in matches[-15:]:  # show recent matches
        print(f"Line {idx} | Source: {source} | Type: {step_type} | Snippet: {snippet}...\n")

if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    search()
