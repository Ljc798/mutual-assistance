from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.posts_model import Square

class SquareReport(Base):
    __tablename__ = "square_reports"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, nullable=False)
    reporter_id = Column(Integer, nullable=False)
    reason = Column(String(255), default='')
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    handled = Column(Boolean, default=False)

    post = relationship(Square, back_populates="reports", foreign_keys=[post_id])
    reports = relationship("SquareReport", back_populates="post", cascade="all, delete-orphan")