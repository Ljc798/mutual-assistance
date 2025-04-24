from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Enum, DECIMAL, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, comment="主键")
    employer_id = Column(Integer, nullable=False, comment="雇主ID")
    employee_id = Column(Integer, nullable=True, comment="雇员ID")
    category = Column(String(20), nullable=False, default="", comment="任务分类")
    status = Column(Integer, nullable=False, default=-1, comment="任务状态：-1-未支付0-待接单 1-进行中 2-已完成 3-取消 4-申诉中")
    position = Column(String(255), nullable=False, default="", comment="取件地址 / 任务位置")
    address = Column(String(255), nullable=False, default="", comment="派送地址 / 投递位置")
    DDL = Column(DateTime, nullable=False, comment="截止时间")
    title = Column(String(30), nullable=False, default="", comment="任务标题")
    offer = Column(DECIMAL(10, 2), nullable=False, comment="报酬金额")
    detail = Column(String(500), nullable=False, default="", comment="任务详情")
    takeaway_code = Column(String(20), default="", comment="取件码")
    takeaway_tel = Column(String(11), nullable=True, comment="手机号尾号")
    takeaway_name = Column(String(50), default="", comment="外卖平台/商品名称")
    employer_done = Column(Boolean, nullable=False, default=False, comment="雇主是否确认完成")
    employee_done = Column(Boolean, nullable=False, default=False, comment="雇员是否确认完成")
    completed_time = Column(DateTime, nullable=True, comment="任务完成时间")
    auto_release_time = Column(DateTime, nullable=True, comment="自动打款时间点")
    has_paid = Column(Boolean, nullable=False, default=False, comment="是否已支付")
    pay_amount = Column(DECIMAL(10, 2), default=0.00, comment="实际支付金额")
    payment_transaction_id = Column(String(128), default=None, comment="微信支付单号")
    refunded = Column(Boolean, default=False, comment="是否已退款")
    cancel_reason = Column(String(255), default=None, comment="取消理由")
    cancel_by = Column(Enum("employer", "employee", "system"), default=None, comment="取消人")
    created_time = Column(DateTime, nullable=False, default=datetime.utcnow, comment="创建时间")
    commission = Column(Integer, default=0, comment="佣金金额（单位：分）")