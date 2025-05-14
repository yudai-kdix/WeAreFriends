import os
from app.core.logger import logger


def ensure_dir(path: str) -> None:
    """
    ディレクトリが存在しない場合に作成する
    """
    os.makedirs(path, exist_ok=True)
    logger.info(f"ディレクトリ作成: {path}")


def save_file(data: bytes, directory: str, filename: str) -> str:
    """
    バイトデータを指定ディレクトリに保存し、ファイルパスを返す
    """
    ensure_dir(directory)
    filepath = os.path.join(directory, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    logger.info(f"ファイル保存: {filepath}")
    return filepath