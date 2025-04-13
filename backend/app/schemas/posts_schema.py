# schemas/posts_schema.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PostImageOut(BaseModel):
    id: int
    image_url: str

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: int
    user_id: int
    content: str
    parent_id: Optional[int]
    root_parent_id: Optional[int]
    created_time: datetime
    likes_count: int

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    content: str
    user_id: int
    likes_count: int
    comments_count: int
    created_time: datetime
    images: List[PostImageOut] = []
    comments: List[CommentOut] = []

    class Config:
        from_attributes = True


