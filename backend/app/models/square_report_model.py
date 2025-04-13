from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.posts_model import Square
from datetime import datetime

class SquareReport(Base):
    __tablename__ = "square_reports"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("square.id"), nullable=False)  # ✅ 加了外键啦！
    reporter_id = Column(Integer, nullable=False)
    reason = Column(String(255), default='')
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    handled = Column(Boolean, default=False)

    post = relationship("Square", back_populates="reports")  # ✅ 没毛病