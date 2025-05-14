import base64
from app.core.logger import logger
from .mock_animals import MOCK_ANIMALS


def chat(text: str, friend: str) -> tuple[str, str]:
    """
    AudioProcessorを呼び出し、テキストと音声(Base64)を返す
    """
    from .audio_processor_wrapper import AudioProcessor
    processor = AudioProcessor(animal=friend)
    reply_text, audio_b64 = processor.chat(text)
    logger.info(f"チャット応答: {reply_text}")
    return reply_text, audio_b64


def process_audio(audio_b64: str, filename: str, friend: str) -> str:
    """
    AudioProcessorで音声解析を行い、テキスト結果を返す
    """
    processor = __import__("app.services.audio_processor_wrapper", fromlist=["AudioProcessor"]).AudioProcessor(animal=friend)
    result = processor.process(audio_b64, filename)
    logger.info(f"音声処理結果: {result}")
    return result