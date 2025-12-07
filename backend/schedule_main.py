from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.timetable.scheduleAPI import router as schedule_router

app = FastAPI()

app.include_router(schedule_router, prefix="/schedule")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
