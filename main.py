# main.py (At the root of your repository)
import subprocess
import sys
import os

if __name__ == "__main__":
    # Absolute path safety fallback
    script_path = os.path.join("src", "app.py")
    
    # Explicitly call the native streamlit binary using the current python environment
    sys.exit(
        subprocess.run([sys.executable, "-m", "streamlit", "run", script_path])
    )