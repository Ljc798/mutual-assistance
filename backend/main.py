from fastapi import FastAPI
from app.api.v1 import users_api, tasks_api, posts_api, withdrawals_api, notifications_api, reports_api, dashboard_api, feedback_api  # 确保 users_schema.py 在 api 文件夹中
app = FastAPI()

app.include_router(users_api.router)
app.include_router(tasks_api.router)
app.include_router(posts_api.router)
app.include_router(withdrawals_api.router)
app.include_router(notifications_api.router)
app.include_router(reports_api.router)
app.include_router(dashboard_api.router)
app.include_router(feedback_api.router)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)