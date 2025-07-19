from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.users_model import User
from app.models.schools_model import School
from app.schemas.users_schema import UserOut
from app.schemas.users_schema import UserUpdate
from app.core.dependencies import verify_token
router = APIRouter()

@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), token_data=Depends(verify_token)):
    try:
        users = db.query(
            User.id,
            User.username,
            User.wxid,
            User.avatar_url,
            User.free_counts,
            User.points,
            User.balance,
            User.school_id,
            School.name.label("school_name"),
            User.phone_number,
            User.vip_expire_time,
            User.created_time
        ).outerjoin(School, User.school_id == School.id).all()

        user_list = []
        for user in users:
            user_dict = dict(user._mapping)  # 👈 这里改
            user_dict["school_name"] = user_dict.get("school_name") or ""
            user_list.append(user_dict)

        return user_list

    except Exception as e:
        print("❌ 错误信息：", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}")
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user