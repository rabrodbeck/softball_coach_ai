import json
import os
import sys

log_path = r"C:\Users\Ryan\.gemini\antigravity\brain\cfb05b62-dbd5-4abd-a2d1-ff67abcc5d50\.system_generated\logs\transcript.jsonl"

def search():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    if not os.path.exists(log_path):
        print("Log path does not exist.")
        return
        
    with open(log_path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                content = str(data.get("content", ""))
                # Look for hugging face/hf and sleep/awake/ping/cron/uptime/prevent
                content_lower = content.lower()
                if ("hugging" in content_lower or "hf " in content_lower) and any(x in content_lower for x in ["sleep", "awake", "ping", "cron", "uptime", "prevent", "keep"]):
                    print(f"--- MATCH AT STEP {data.get('step_index', idx)} ---")
                    print(content.strip())
                    print("\n" + "="*80 + "\n")
            except Exception as e:
                pass

if __name__ == "__main__":
    search()
