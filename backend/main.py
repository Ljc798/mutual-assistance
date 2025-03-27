from fastapi import FastAPI
from app.api.v1 import users  # 确保 users.py 在 api 文件夹中

app = FastAPI()

app.include_router(users.router)