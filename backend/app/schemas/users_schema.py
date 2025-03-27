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
    school_id: int
    phone_number: str
    vip_expire_time: date
    created_time: datetime

class UserUpdate(BaseModel):
    username: Optional[str]
    wxid: Optional[str]
    free_counts: Optional[int]
    points: Optional[int]
    vip_expire_time: Optional[date]

    class Config:
        from_attributes = True

