from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.withdrawals_model import Withdrawal, StatusEnum
from app.schemas.withdrawals_schema import WithdrawalOut
from datetime import datetime
router = APIRouter()

@router.get("/withdrawals", response_model=List[WithdrawalOut])
def get_withdrawals(db: Session = Depends(get_db)):
    try:
        records = db.query(Withdrawal).all()
        return records
    except Exception as e:
        print("❌ 获取失败：", e)
        raise HTTPException(status_code=500, detail="查询失败")


@router.put("/withdrawals/{withdrawal_id}/status")
def update_withdrawal_status(
    withdrawal_id: int,
    new_status: StatusEnum,  # 直接用枚举值：'approved'、'rejected'等
    db: Session = Depends(get_db)
):
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="记录未找到")

    if withdrawal.status != StatusEnum.pending:
        raise HTTPException(status_code=400, detail="已处理记录无法修改")

    withdrawal.status = new_status

    if new_status == StatusEnum.approved:
        withdrawal.processed_at = datetime.utcnow()
    elif new_status == StatusEnum.rejected:
        withdrawal.processed_at = datetime.utcnow()

    db.commit()
    return {"message": f"状态已更新为 {new_status.value}"}