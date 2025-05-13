from abc import ABC, abstractmethod
import base64

class MediaProcessor(ABC):
    @abstractmethod
    def process(self, data: str, filename: str) -> str:
        """メディアデータを処理する抽象メソッド"""
        pass