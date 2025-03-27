from sqlalchemy import Column, Integer, String, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    wxid = Column(String(50), unique=True, index=True, nullable=False)
    avatar_url = Column(String(50), unique=True, index=True, nullable=False)
    free_counts = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    school_id = Column(Integer, nullable=False)
    phone_number = Column(String(50), unique=True, nullable=False)
    vip_expire_time = Column(Date, nullable=False)
    created_time = Column(DateTime, nullable=False)
