from fastapi import APIRouter
from datetime import datetime
from app.core.logger import logger

router = APIRouter()

@router.get("/health-check")
async def health_check():
    logger.info("ヘルスチェック要求を受信")
    return {"status": "ok", "timestamp": datetime.now().isoformat()}