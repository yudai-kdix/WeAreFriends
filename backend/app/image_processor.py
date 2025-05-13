import base64
from media_processor import MediaProcessor

class ImageProcessor(MediaProcessor):
    def process(self, data: str, filename: str) -> str:
        file_data = base64.b64decode(data)
        file_path = f"received_images/{filename}"
        with open(file_path, "wb") as f:
            f.write(file_data)
        # TODO: ここに画像認識などの処理を追加
        return f"Image {filename} received and saved."