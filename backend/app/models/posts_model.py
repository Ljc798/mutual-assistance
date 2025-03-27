from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Post(Base):
    __tablename__ = 'square'
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(10), default="")
    user_id = Column(Integer, nullable=False)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    school_id = Column(Integer)
    created_time = Column(DateTime)

class PostImage(Base):
    __tablename__ = 'square_images'
    id = Column(Integer, primary_key=True, index=True)
    square_id = Column(Integer, nullable=False)
    image_url = Column(String(255), nullable=False)