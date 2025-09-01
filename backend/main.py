from fastapi import FastAPI
from app.api.v1 import users_api, tasks_api, posts_api, withdrawals_api, notifications_api, reports_api, dashboard_api, feedback_api, login_api, scheduleAPI
app = FastAPI(
    docs_url=None,        # 禁用 Swagger UI
    redoc_url=None,       # 禁用 Redoc 文档
    openapi_url=None      # 禁用 OpenAPI schema
)

app.include_router(users_api.router, prefix="/api")
app.include_router(tasks_api.router, prefix="/api")
app.include_router(posts_api.router, prefix="/api")
app.include_router(withdrawals_api.router, prefix="/api")
app.include_router(notifications_api.router, prefix="/api")
app.include_router(reports_api.router, prefix="/api")
app.include_router(dashboard_api.router, prefix="/api")
app.include_router(feedback_api.router, prefix="/api")
app.include_router(login_api.router, prefix="/api")
app.include_router(scheduleAPI.router, prefix="/schedule", tags=["schedule"])

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)