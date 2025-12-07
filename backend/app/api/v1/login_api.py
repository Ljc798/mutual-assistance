from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import os

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")

@router.post("/login")
def login(req: LoginRequest):
    if req.username != os.getenv("ADMIN_USERNAME") or req.password != os.getenv("ADMIN_PASSWORD"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode({
        "sub": req.username,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }, SECRET_KEY, algorithm="HS256")

    return {"token": token}