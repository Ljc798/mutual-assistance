from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.tasks_model import Task
from app.schemas.tasks_schema import TaskOut
from app.core.database import get_db
from app.core.dependencies import verify_token

router = APIRouter()

@router.get("/tasks", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db), token_data = Depends(verify_token)):
    tasks = db.query(Task).all()
    return tasks
