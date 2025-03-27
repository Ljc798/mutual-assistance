from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.posts_model import Post, PostImage
from app.schemas.posts_schema import PostOut, PostDetailOut

router = APIRouter()

@router.get("/posts", response_model=List[PostOut])
def get_all_posts(db: Session = Depends(get_db)):
    try:
        posts = db.query(Post).order_by(Post.created_time.desc()).all()
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{square_id}", response_model=PostDetailOut)
def get_post_detail(square_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == square_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    images = db.query(PostImage).filter(PostImage.square_id == square_id).all()
    return {
        "id": post.id,
        "content": post.content,
        "category": post.category,
        "user_id": post.user_id,
        "likes_count": post.likes_count,
        "comments_count": post.comments_count,
        "school_id": post.school_id,
        "created_time": post.created_time,
        "images": [img.image_url for img in images]
    }