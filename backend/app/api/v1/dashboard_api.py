from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.users_model import User
from app.models.tasks_model import Task
from app.models.posts_model import Square
from app.core.dependencies import verify_token

router = APIRouter()


@router.get("/dashboard/summary")
def dashboard_summary(
        db: Session = Depends(get_db),
        token_data=Depends(verify_token)
):
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    new_users = db.query(func.count(User.id)).filter(User.created_time >= today_start).scalar()
    new_tasks = db.query(func.count(Task.id)).filter(Task.created_time >= today_start).scalar()
    unfinished_tasks = db.query(func.count(Task.id)).filter(Task.status != 2).scalar()
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


@router.get("/dashboard/user-growth")
def user_growth_data(db: Session = Depends(get_db), token_data = Depends(verify_token)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days = 7
    data = []

    for i in range(days):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)

        count = db.query(func.count(User.id)).filter(
            and_(User.created_time >= day_start, User.created_time < day_end)
        ).scalar()

        data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })

    return list(reversed(data))


@router.get("/dashboard/task-stats")
def task_stats_data(db: Session = Depends(get_db), token_data = Depends(verify_token)):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days = 7
    result = []

    for i in range(days):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)

        published = db.query(func.count(Task.id)).filter(
            Task.created_time >= day_start,
            Task.created_time < day_end
        ).scalar()

        completed = db.query(func.count(Task.id)).filter(
            Task.completed_time >= day_start,
            Task.completed_time < day_end
        ).scalar()

        result.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "published": published,
            "completed": completed
        })

    return list(reversed(result))


@router.get("/dashboard/user-structure")
def user_structure_data(db: Session = Depends(get_db), token_data = Depends(verify_token)):
    today = datetime.now()

    result = db.query(
        case(
            (User.vip_expire_time > today, "会员"),
            else_="非会员"
        ).label("status"),
        func.count(User.id)
    ).group_by("status").all()

    return [{"role": status, "count": count} for status, count in result]


@router.get("/dashboard/post-category")
def post_category_stats(db: Session = Depends(get_db)):
    result = db.query(Square.category, func.count(Square.id)).group_by(Square.category).all()
    return [{"category": cat, "count": count} for cat, count in result]
