# models/posts_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Square(Base):
    __tablename__ = 'square'

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(10), default="")
    user_id = Column(Integer, nullable=False)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    school_id = Column(Integer)
    created_time = Column(DateTime, default=datetime.utcnow)
    is_pinned = Column(Integer, default=0)
    images = relationship("PostImage", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("SquareComment", back_populates="post", cascade="all, delete-orphan")
    reports = relationship("SquareReport", back_populates="post", cascade="all, delete-orphan")  # 🫶 加上它！

class PostImage(Base):
    __tablename__ = 'square_images'

    id = Column(Integer, primary_key=True, index=True)
    square_id = Column(Integer, ForeignKey('square.id'))
    image_url = Column(String(255), nullable=False)

    post = relationship("Square", back_populates="images")


class SquareComment(Base):
    __tablename__ = 'square_comments'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    square_id = Column(Integer, ForeignKey("square.id"))
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, nullable=True)
    root_parent_id = Column(Integer, nullable=True)
    created_time = Column(DateTime, default=datetime.utcnow)
    likes_count = Column(Integer, default=0)

    post = relationship("Square", back_populates="comments")


