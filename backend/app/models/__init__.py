from fastapi import FastAPI
from app.core.database import engine
from app.models.users_model import Base

app = FastAPI()

# 创建表
Base.metadata.create_all(bind=engine)