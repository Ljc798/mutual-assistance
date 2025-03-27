from pydantic import BaseModel
from datetime import datetime

class UserOut(BaseModel):
    id: int
    username: str
    status: str
    user_type: str
    created_time: datetime

    class Config:
        orm_mode = True  # 允许从 ORM 模型转换