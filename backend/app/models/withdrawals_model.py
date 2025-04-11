from sqlalchemy import Column, Integer, String, Enum, DECIMAL, DateTime
from app.core.database import Base
from datetime import datetime
import enum

class MethodEnum(str, enum.Enum):
    wechat = "微信"
    alipay = "支付宝"

class StatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    method = Column(
        Enum(MethodEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    phone = Column(String(20), nullable=False)
    status = Column(Enum(StatusEnum), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    note = Column(String(255), nullable=True)