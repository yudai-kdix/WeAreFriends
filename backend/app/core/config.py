from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # アプリケーション設定
    APP_NAME: str = "We Are Friends"
    DEBUG: bool = True
    ALLOWED_ORIGINS: list[str] = ["*"]  # 本番では制限すること
    
    # ファイル保存ディレクトリ
    IMAGES_DIR: str = "received_images"
    AUDIOS_DIR: str = "received_audios"

    OPENAI_API_KEY: str

    # データベース設定
    DATABASE_URL: str
    ALEMBIC_DATABASE_URL: str
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"