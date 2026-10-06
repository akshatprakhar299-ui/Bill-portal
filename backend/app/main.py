from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import FRONTEND_ORIGIN
from app.database.database import Base, engine
from app.routers import auth, bills, notifications, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ACES Bill Portal API",
    version="1.0.0",
    description="Role-based ACES event bill approval portal",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(bills.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {
        "name": "ACES Bill Portal API",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
