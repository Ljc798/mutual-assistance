from pydantic import BaseModel
from datetime import datetime

class FeedbackBase(BaseModel):
    user_id: int
    title: str
    content: str

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime
    reward_points: int
    is_resolved: bool  # 加上它！！！


class ResolvePayload(BaseModel):
    reward_points: int

    class Config:
        from_attributes = True  # Pydantic v2 friendly

