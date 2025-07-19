from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="")
    province = Column(String(255), nullable=False, default="")
    city = Column(String(255), nullable=False, default="")

    users = relationship("User", back_populates="school")