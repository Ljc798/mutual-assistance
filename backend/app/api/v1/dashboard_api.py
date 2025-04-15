from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.users_model import User
from app.models.tasks_model import Task
from app.models.posts_model import Square

router = APIRouter()


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    new_users = db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar()
    new_tasks = db.query(func.count(Task.id)).filter(Task.created_time >= today_start).scalar()
    unfinished_tasks = db.query(func.count(Task.id)).filter(Task.status != "completed").scalar()
    new_posts = db.query(func.count(Square.id)).filter(Square.created_time >= today_start).scalar()
    total_posts = db.query(func.count(Square.id)).scalar()

    # 假设有一个 income 表或直接写死为演示
    today_income = 53  # 示例

    return {
        "new_users_today": new_users,
        "new_tasks_today": new_tasks,
        "unfinished_tasks": unfinished_tasks,
        "new_posts_today": new_posts,
        "total_posts": total_posts,
        "income_today": today_income
    }