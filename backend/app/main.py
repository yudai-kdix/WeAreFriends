# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import Settings
from app.core.logger import logger
from app.routers.health import router as health_router
from app.routers.identify import router as identify_router
from app.routers.websocket import router as ws_router
from app.routers.organization import router as organization_router

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # アプリ起動時
    logger.info("アプリケーション起動")
    yield
    # アプリ終了時
    logger.info("アプリケーション停止")

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,   # ここで登録
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ルーター登録
app.include_router(health_router)
app.include_router(identify_router)
app.include_router(ws_router)
app.include_router(organization_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )