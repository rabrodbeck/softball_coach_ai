import sys
import os

# Add the project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from src.database import init_db

print("Running database migrations...")
try:
    init_db()
    print("Database migrations applied successfully!")
except Exception as e:
    print(f"Error applying migrations: {e}")
    sys.exit(1)
