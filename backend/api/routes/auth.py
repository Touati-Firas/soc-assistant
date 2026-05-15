"""
Authentication API routes
"""

from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from auth import verify_elasticsearch_user, create_access_token, verify_token
from datetime import timedelta
from typing import Optional

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request payload."""
    username: str
    password: str


class AuthResponse(BaseModel):
    """Authentication response with token."""
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate user against Elasticsearch.
    User must have 'soc-analyst' role.
    
    Returns JWT access token valid for 24 hours.
    """
    # Verify credentials against Elasticsearch
    user_data = await verify_elasticsearch_user(request.username, request.password)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or insufficient permissions (soc-analyst role required)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": user_data["username"], "roles": user_data["roles"]},
        expires_delta=timedelta(hours=24)
    )
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "username": user_data["username"],
            "full_name": user_data.get("full_name"),
            "email": user_data.get("email"),
            "roles": user_data["roles"],
        }
    )


@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user from token.
    Used by frontend to validate session.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token"
        )
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return {
        "username": payload.get("sub"),
        "roles": payload.get("roles", [])
    }
