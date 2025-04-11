from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.withdrawals_model import MethodEnum, StatusEnum

class WithdrawalOut(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    method: MethodEnum
    phone: str
    status: StatusEnum
    created_at: datetime
    processed_at: Optional[datetime] = None
    note: Optional[str] = None

    class Config:
        orm_mode = True