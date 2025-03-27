from fastapi import FastAPI
from database import engine
from models.test_user import TestUser

app = FastAPI()

# 创建表
TestUser.metadata.create_all(bind=engine)