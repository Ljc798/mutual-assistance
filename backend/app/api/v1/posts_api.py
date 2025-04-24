# api/posts_api.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.posts_model import Square
from app.schemas.posts_schema import PostOut
from typing import List
from app.models.posts_model import SquareComment
from sqlalchemy import text
from sqlalchemy import desc
from app.core.dependencies import verify_token

router = APIRouter()

@router.get("/posts", response_model=List[PostOut])
def get_post_list(db: Session = Depends(get_db), token_data = Depends(verify_token)):
    posts = db.query(Square).options(
        joinedload(Square.images),
        joinedload(Square.comments)
    ).order_by(desc(Square.is_pinned), desc(Square.created_time))
    return posts


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post_detail(post_id: int, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    post = db.query(Square).options(
        joinedload(Square.images),
        joinedload(Square.comments)
    ).filter(Square.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return post

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    comment = db.query(SquareComment).filter(SquareComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    db.delete(comment)
    db.commit()
    return {"message": "删除成功"}


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    post = db.query(Square).filter(Square.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    # 删除评论点赞（基于 comment_id）
    db.execute(text("""
        DELETE FROM comment_likes 
        WHERE comment_id IN (
            SELECT id FROM square_comments WHERE square_id = :post_id
        )
    """), {"post_id": post_id})

    # 删除评论
    db.execute(text("DELETE FROM square_comments WHERE square_id = :post_id"), {"post_id": post_id})

    # 删除帖子点赞
    db.execute(text("DELETE FROM square_likes WHERE square_id = :post_id"), {"post_id": post_id})

    # 删除图片
    db.execute(text("DELETE FROM square_images WHERE square_id = :post_id"), {"post_id": post_id})

    # 删除举报（如果你用了举报功能）
    db.execute(text("DELETE FROM square_reports WHERE post_id = :post_id"), {"post_id": post_id})

    # 最后删除帖子本体
    db.delete(post)
    db.commit()

    return {"message": "帖子和相关数据已成功删除"}

@router.post("/posts/{post_id}/pin")
def pin_post(post_id: int, db: Session = Depends(get_db), token_data = Depends(verify_token)):
    post = db.query(Square).filter(Square.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    post.is_pinned = not post.is_pinned
    db.commit()
    return {"message": "置顶状态已更新", "is_pinned": post.is_pinned}