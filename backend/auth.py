"""
Authentication module — Elasticsearch-based user authentication
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from config import settings
from elasticsearch import AsyncElasticsearch
import httpx

# JWT Configuration
SECRET_KEY = settings.elastic_password or "soc-assistant-secret-key"  # Use elastic password as secret
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 1440  # 24 hours


async def verify_elasticsearch_user(
    username: str, password: str
) -> Optional[dict]:
    """
    Verify user credentials against Elasticsearch and check roles.
    Uses Elasticsearch's _authenticate API to validate credentials without elevated privileges.
    """
    try:
        # Try to connect with provided credentials to Elasticsearch
        es_client = AsyncElasticsearch(
            hosts=[settings.elastic_url],
            basic_auth=(username, password),
            verify_certs=settings.elastic_verify_certs,
            ca_certs=settings.elastic_ca_cert,
            request_timeout=10,
        )
        
        # Verify credentials by calling the _authenticate API (doesn't require elevated privileges)
        user_info = await es_client.security.authenticate()
        print(f"✅ User info returned: {user_info}")
        
        # Extract user data
        username_from_es = user_info.get("username")
        roles = user_info.get("roles", [])
        
        print(f"📋 Username: {username_from_es}, Roles: {roles}")
        
        # Verify user exists and has SOC-Analyst role
        if not username_from_es:
            print(f"❌ No username in response")
            await es_client.close()
            return None
        
        if "SOC-Analyst" not in roles:
            print(f"❌ SOC-Analyst role not found. User has: {roles}")
            await es_client.close()
            return None
        
        await es_client.close()
        
        print(f"✅ User {username_from_es} authenticated successfully")
        return {
            "username": username_from_es,
            "roles": roles,
            "full_name": user_info.get("full_name", username_from_es),
            "email": user_info.get("email", ""),
        }
    except Exception as e:
        print(f"❌ Authentication error for {username}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return payload
    except JWTError:
        return None
