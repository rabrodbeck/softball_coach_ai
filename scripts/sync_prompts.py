import os
import sys
import yaml

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database import get_db_connection

def sync_prompt(yaml_path: str):
    if not os.path.exists(yaml_path):
        print(f"Error: Prompt file not found at {yaml_path}")
        return

    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    prompt_key = data['key']
    content = data['content'].strip()
    description = data.get('description', '')

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Fetch current database prompt if it exists
        cursor.execute(
            "SELECT content, version FROM system_prompts WHERE key = %s LIMIT 1;", 
            (prompt_key,)
        )
        existing = cursor.fetchone()

        if not existing:
            # First time inserting
            print(f"Adding new prompt '{prompt_key}' (v1)...")
            cursor.execute(
                """
                INSERT INTO system_prompts (key, content, version, description)
                VALUES (%s, %s, 1, %s)
                RETURNING version;
                """,
                (prompt_key, content, description)
            )
            # Log in history
            cursor.execute(
                """
                INSERT INTO system_prompt_history (prompt_key, content, version, updated_by)
                VALUES (%s, %s, 1, 'initial_sync');
                """,
                (prompt_key, content)
            )
        else:
            db_content = existing['content']
            db_version = existing['version']

            if db_content == content:
                print(f"Prompt '{prompt_key}' is up to date (v{db_version}). No sync required.")
                return

            new_version = db_version + 1
            print(f"Updating prompt '{prompt_key}' from v{db_version} to v{new_version}...")
            
            # Update main record
            cursor.execute(
                """
                UPDATE system_prompts 
                SET content = %s, version = %s, description = %s, updated_at = CURRENT_TIMESTAMP
                WHERE key = %s;
                """,
                (content, new_version, description, prompt_key)
            )
            
            # Log history
            cursor.execute(
                """
                INSERT INTO system_prompt_history (prompt_key, content, version, updated_by)
                VALUES (%s, %s, %s, 'git_sync');
                """,
                (prompt_key, content, new_version)
            )

        conn.commit()
        print("Sync completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"Sync failed: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    yaml_file = os.path.join("prompts", "agent_system_prompt.yaml")
    sync_prompt(yaml_file)