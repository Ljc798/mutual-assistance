from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class PostOut(BaseModel):
    id: int
    content: str
    category: str
    user_id: int
    likes_count: int
    comments_count: int
    school_id: Optional[int]
    created_time: datetime

class PostDetailOut(PostOut):
    images: List[str]

    class Config:
        from_attributes = True

