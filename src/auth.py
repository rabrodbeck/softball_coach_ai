import os
import time
import jwt
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from cryptography.x509 import load_pem_x509_certificate
from src.database import get_coach_by_email, get_db_connection

security = HTTPBearer()
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "softball_coach_ai")

# Cache for Google's public certificates (to avoid network lag on every request)
_public_keys = {}
_keys_expiry = 0

def get_firebase_public_keys():
    global _public_keys, _keys_expiry
    now = time.time()
    if not _public_keys or now > _keys_expiry:
        url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        res = requests.get(url)
        if res.ok:
            _public_keys = res.json()
            cache_control = res.headers.get("cache-control", "")
            max_age = 3600
            for part in cache_control.split(","):
                if "max-age" in part:
                    try:
                        max_age = int(part.split("=")[1])
                    except ValueError:
                        pass
            _keys_expiry = now + max_age
    return _public_keys

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI Dependency: Extracts values and validates the Firebase ID token in authorization headers."""
    token = credentials.credentials
    try:
        # Fetch kid (Key ID) from token header
        unverified_headers = jwt.get_unverified_header(token)
        kid = unverified_headers.get("kid")
        if not kid:
            print("Auth Error: Token headers missing kid.")
            raise HTTPException(status_code=401, detail="Token headers missing kid.")
        
        # Match with current Google certificates
        public_keys = get_firebase_public_keys()
        cert = public_keys.get(kid)
        if not cert:
            print(f"Auth Error: Invalid key ID (kid) '{kid}' for token.")
            raise HTTPException(status_code=401, detail="Invalid key ID (kid) for token.")
        
        # Convert X509 certificate string to a public key object
        cert_obj = load_pem_x509_certificate(cert.encode('utf-8'))
        public_key = cert_obj.public_key()

        # Decode and Validate signature, expiration, audience, and issuer
        decoded = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
        )
        return decoded
    except jwt.ExpiredSignatureError as e:
        print(f"Auth Error: Token expired: {e}")
        raise HTTPException(status_code=401, detail="Authentication token has expired")
    except jwt.InvalidTokenError as e:
        print(f"Auth Error: Invalid token: {e} | Project ID: '{FIREBASE_PROJECT_ID}' | Headers: {jwt.get_unverified_header(token)}")
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")
    
def get_current_coach(token_payload: dict = Depends(verify_firebase_token)) -> dict:
    """FastAPI Dependency: Fetches the authenticated coach profile using the email from token."""
    email = token_payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Auth token missing email address")
    
    coach = get_coach_by_email(email)
    if not coach:
        raise HTTPException(status_code=404, detail="Coach profile not registered in database")
    return coach

def verify_team_ownership(team_id: int, current_coach: dict = Depends(get_current_coach)):
    """FastAPI Dependency: Raises a 403 error if the authenticated coach is not associate with this team."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT role FROM team_coaches WHERE team_id = %s AND coach_id = %s AND is_active = true LIMIT 1;",
                       (team_id, current_coach["id"])
                       )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access rights for this team.")
        return row["role"]
    finally:
        cursor.close()
        conn.close()