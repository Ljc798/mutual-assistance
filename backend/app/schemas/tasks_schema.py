from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskOut(BaseModel):
    id: int
    employer_id: int  # 雇主id
    employee_id: Optional[int]  # 雇员id
    category: str  # 分类id
    status: int  # 状态 0-待接单 1-进行中 2-已完成
    position: str  # 任务地址
    address: str  # 派送地址
    DDL: datetime  # 截止时间
    title: str  # 任务标题
    offer: float  # 报酬
    detail: str  # 任务详情
    takeaway_code: Optional[str] = None  # 取件码
    takeaway_tel: Optional[str] = None  # 手机尾号
    takeaway_name: Optional[str] = None  # 外卖名称

    class Config:
        from_attributes = True

