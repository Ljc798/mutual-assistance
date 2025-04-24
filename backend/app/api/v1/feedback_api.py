from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.feedback_model import Feedback
from app.schemas.feedback_schema import FeedbackOut, FeedbackCreate
from app.models.notifications_model import Notification
from app.models.users_model import User  # 假设你有这个
from app.schemas.feedback_schema import ResolvePayload
router = APIRouter()

# 获取所有反馈
@router.get("/feedbacks", response_model=List[FeedbackOut])
def get_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()

# 获取单个反馈
@router.get("/feedbacks/{feedback_id}", response_model=FeedbackOut)
def get_feedback_detail(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="反馈不存在")
    return feedback

@router.post("/feedbacks/{feedback_id}/resolve")
def resolve_feedback(feedback_id: int, payload: ResolvePayload, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if feedback.is_resolved:
        raise HTTPException(status_code=400, detail="该反馈已处理过，别想重复奖励")

    feedback.reward_points = payload.reward_points
    feedback.is_resolved = True
    if not feedback:
        raise HTTPException(status_code=404, detail="反馈不存在")

    feedback.reward_points = payload.reward_points
    db.commit()

    now = datetime.utcnow() + timedelta(hours=8)
    print("当前北京时间：", now.strftime("%Y-%m-%d %H:%M:%S"))  # ✅ 控制台确认你拿的是 now
    formatted_now = now.strftime("%Y-%m-%d %H:%M:%S")

    notification = Notification(
        user_id=feedback.user_id,
        type="system",
        title="反馈处理通知",
        content=f"感谢您的反馈，我们已于 {formatted_now} 处理并奖励了您 {payload.reward_points} 积分。",
        is_read=False,
        created_at = now
    )
    db.add(notification)
    db.commit()

    return {"message": "反馈已处理并通知用户"}