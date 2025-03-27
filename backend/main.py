from fastapi import FastAPI
from app.api.v1 import users_api, tasks_api, posts_api  # 确保 users_schema.py 在 api 文件夹中
app = FastAPI()

app.include_router(users_api.router)
app.include_router(tasks_api.router)
app.include_router(posts_api.router)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 可以改成你小程序的线上域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)