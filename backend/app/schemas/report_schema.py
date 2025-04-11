from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PostPreview(BaseModel):
    id: int
    content: str
    user_id: int

    class Config:
        orm_mode = True

class ReportOut(BaseModel):
    id: int
    post_id: int
    reporter_id: int
    reason: Optional[str]
    description: Optional[str]
    created_at: datetime
    handled: bool
    post: Optional[PostPreview]

    class Config:
        orm_mode = True