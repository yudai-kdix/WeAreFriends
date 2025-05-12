import base64
from media_processor import MediaProcessor

class AudioProcessor(MediaProcessor):
    def process(self, data: str, filename: str) -> str:
        file_data = base64.b64decode(data)
        file_path = f"received_audios/{filename}"
        with open(file_path, "wb") as f:
            f.write(file_data)
        # TODO: ここに音声認識やTTS生成などの処理を追加
        return f"Audio {filename} received and saved."