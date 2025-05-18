# from pydantic_settings import BaseSettings, SettingsConfigDict
# from typing import List

# class Settings(BaseSettings):
#     # アプリケーション設定
#     APP_NAME: str = "We Are Friends"
#     DEBUG: bool = True
#     ALLOWED_ORIGINS: List[str] = ["*"]  # 本番では制限すること
    
#     # async エンジン用にドライバ付きスキームをデフォルトに
#     DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
#     ALEMBIC_DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    
#     # ファイル保存ディレクトリ
#     IMAGES_DIR: str = "received_images"
#     AUDIOS_DIR: str = "received_audios"

#     # データベース設定
#     DATABASE_URL: str
#     ALEMBIC_DATABASE_URL: str

#     model_config = SettingsConfigDict(
#         env_file=".env",
#         env_file_encoding="utf-8",
#         extra = "ignore"
#     )

# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # アプリケーション設定
    APP_NAME: str = "We Are Friends"
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["*"]  # 本番では制限すること
    
    # async エンジン用にドライバ付きスキームをデフォルトに
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    ALEMBIC_DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    
    # ファイル保存ディレクトリ
    IMAGES_DIR: str = "received_images"
    AUDIOS_DIR: str = "received_audios"

    # ↑ここで一度だけ定義すれば OK↑

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )