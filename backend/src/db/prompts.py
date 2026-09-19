import time
from src.db.pool import get_db_connection

# A simple local in-memory TTL (Time-To-Live) cache
class SimpleTTLCache:
    def __init__(self, ttl_seconds: int = 300): # Defaults to 5 minutes
        self.ttl = ttl_seconds
        self.cache = {}

    def get(self, key: str):
        if key in self.cache:
            val, expiry = self.cache[key]
            if time.time() < expiry:
                return val
            # Expired
            del self.cache[key]
        return None

    def set(self, key: str, value: any):
        self.cache[key] = (value, time.time() + self.ttl)

# Instantiate a global cache for prompts
_prompt_cache = SimpleTTLCache(ttl_seconds=300)


def get_system_prompt(key: str, fallback_content: str) -> str:
    """Retrieves the system prompt content from cache, falling back to database or hardcoded text."""
    # 1. Try reading from memory cache
    cached_prompt = _prompt_cache.get(key)
    if cached_prompt:
        return cached_prompt

    # 2. Try reading from the database
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT content FROM system_prompts WHERE key = %s LIMIT 1;", (key,))
        row = cursor.fetchone()
        if row:
            content = row["content"]
            # Save to cache
            _prompt_cache.set(key, content)
            return content
    except Exception as e:
        print(f"Warning: Failed to fetch prompt '{key}' from database: {e}")
    finally:
        cursor.close()
        conn.close()

    # 3. Fallback to hardcoded content if database is empty or connection fails
    return fallback_content

