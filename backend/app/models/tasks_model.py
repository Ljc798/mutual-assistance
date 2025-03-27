from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, comment="主键")
    employer_id = Column(Integer, nullable=False, comment="雇主id")
    employee_id = Column(Integer, nullable=True, comment="雇员id")
    category = Column(String(10), nullable=False, default="", comment="分类id")
    status = Column(Integer, nullable=False, comment="状态 0-待接单 1-进行中 2-已完成")
    position = Column(String(255), nullable=False, default="", comment="任务地址")
    address = Column(String(255), nullable=False, default="", comment="派送地址")
    DDL = Column(DateTime, nullable=False, comment="截止时间")
    title = Column(String(15), nullable=False, default="", comment="任务标题")
    offer = Column(Float, nullable=False, comment="报酬")
    detail = Column(String(255), nullable=False, default="", comment="任务详情")
    takeaway_code = Column(String(20), default="", comment="取件码")
    takeaway_tel = Column(Integer, nullable=True, comment="手机尾号")
    takeaway_name = Column(String(10), default="", comment="外卖名称")
