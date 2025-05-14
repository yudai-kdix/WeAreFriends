import os
import base64
import random
from app.core.logger import logger
from app.services.mock_animals import MOCK_ANIMALS


def save_image(image_base64: str, images_dir: str) -> str:
    """
    Base64画像をデコードして保存し、ファイル名を返す
    """
    os.makedirs(images_dir, exist_ok=True)
    image_data = base64.b64decode(image_base64)
    filename = f"animal_{int(random.random()*1e9)}.jpg"
    filepath = os.path.join(images_dir, filename)
    with open(filepath, "wb") as f:
        f.write(image_data)
    logger.info(f"画像を保存: {filepath}")
    return filename


def detect_animal(filename: str) -> tuple[str, float]:
    """
    既存のロジックでランダムに動物を選択して返す
    """
    animal = random.choice(MOCK_ANIMALS)
    confidence = round(random.uniform(0.7, 0.98), 2)
    logger.info(f"ランダム動物: {animal}, 信頼度: {confidence}")
    return animal, confidence


def save_ws_image(image_base64: str, filename: str) -> None:
    """
    WebSocketから受信したBase64画像を保存
    """
    os.makedirs(os.path.dirname(filename) or ".", exist_ok=True)
    data = base64.b64decode(image_base64)
    with open(os.path.join("received_images", filename), "wb") as f:
        f.write(data)
    logger.info(f"WS画像を保存: {filename}")