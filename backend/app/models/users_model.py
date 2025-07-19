from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    wxid = Column(String(50), unique=True, index=True, nullable=False)
    avatar_url = Column(String(255), nullable=False)
    free_counts = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    balance = Column(Integer, nullable=False)
    school_id = Column(Integer, ForeignKey('schools.id'))  # 👈 加这个外键
    phone_number = Column(String(50), unique=True, nullable=False)
    vip_expire_time = Column(Date, nullable=False)
    created_time = Column(DateTime, nullable=False)

    school = relationship("School", back_populates="users")  # 👈 加这个反向关系