from pydantic import BaseModel
from datetime import datetime

class FeedbackBase(BaseModel):
    user_id: int
    title: str
    content: str

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackOut(FeedbackBase):
    id: int
    created_at: datetime
    reward_points: int

class ResolvePayload(BaseModel):
    reward_points: int

    class Config:
        from_attributes = True  # Pydantic v2 friendly

