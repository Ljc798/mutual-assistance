class UserOut:
    pass

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String(100), unique=True, index=True, nullable=False)
    nickname = Column(String(50))
    avatar = Column(String(255))
    gender = Column(Integer)
    created_time = Column(DateTime, default=datetime.datetime.utcnow)