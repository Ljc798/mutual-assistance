from datetime import date, datetime

from pydantic import BaseModel
from typing import Optional
class UserOut(BaseModel):
    id: int
    username: str
    wxid: str
    avatar_url: str
    free_counts: int
    points: int
    balance: float
    school_id: int
    school_name: Optional[str] = None
    phone_number: str
    vip_expire_time: date
    created_time: datetime

class UserUpdate(BaseModel):
    username: Optional[str]
    wxid: Optional[str]
    free_counts: Optional[int]
    points: Optional[int]
    balance: Optional[float]
    vip_expire_time: Optional[date]

    class Config:
        from_attributes = True

