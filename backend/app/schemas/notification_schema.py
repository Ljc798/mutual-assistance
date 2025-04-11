from pydantic import BaseModel
from typing import Optional

class NotificationCreate(BaseModel):
    user_id: int
    type: str
    title: Optional[str]
    content: str