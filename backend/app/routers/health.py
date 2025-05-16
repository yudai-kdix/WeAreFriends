from fastapi import APIRouter
from datetime import datetime
from app.managers.connection_manager import manager
from app.core.logger import logger

router = APIRouter()

@router.get("/health-check")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}