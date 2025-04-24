from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.notification_schema import NotificationCreate
from app.models.notifications_model import Notification
from app.core.database import get_db
from app.core.dependencies import verify_token

router = APIRouter()

@router.post("/notifications")
def create_notification(data: NotificationCreate, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="通知内容不能为空")

    notification = Notification(
        user_id=data.user_id,
        type=data.type,
        title=data.title,
        content=data.content
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return {"message": "通知已发送", "id": notification.id}