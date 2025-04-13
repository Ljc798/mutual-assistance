# api/posts_api.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.posts_model import Square
from app.schemas.posts_schema import PostOut
from typing import List

router = APIRouter()

@router.get("/posts", response_model=List[PostOut])
def get_post_list(db: Session = Depends(get_db)):
    posts = db.query(Square).options(
        joinedload(Square.images),
        joinedload(Square.comments)
    ).all()
    return posts


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post_detail(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Square).options(
        joinedload(Square.images),
        joinedload(Square.comments)
    ).filter(Square.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return post
