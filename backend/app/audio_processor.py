# import base64
# from media_processor import MediaProcessor

# class AudioProcessor(MediaProcessor):
#     def process(self, data: str, filename: str) -> str:
#         file_data = base64.b64decode(data)
#         file_path = f"received_audios/{filename}"
#         with open(file_path, "wb") as f:
#             f.write(file_data)
#         # TODO: ここに音声認識やTTS生成などの処理を追加
#         return f"Audio {filename} received and saved."

import base64
import os
from openai import OpenAI
from dotenv import load_dotenv
from media_processor import MediaProcessor

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AudioProcessor(MediaProcessor):
    def __init__(self, animal="犬"):
        self.animal = animal
        self.messages = [{"role": "system", "content": self.get_prompt()}]

    def get_prompt(self) -> str:
        template = "あなたは{animal}です。語尾を{animal}のようにして会話してください。"
        return template.format(animal=self.animal)

    def chat(self, user_input: str) -> str:
        self.messages.append({"role": "user", "content": user_input})
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=self.messages
        )
        reply = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": reply})
        return reply

    def process(self, data: str, filename: str) -> str:
        file_data = base64.b64decode(data)
        file_path = f"received_audios/{filename}"
        with open(file_path, "wb") as f:
            f.write(file_data)

        # TODO: 音声を文字起こししたとして仮の入力
        user_input = "こんにちは、何が見られる？"
        gpt_reply = self.chat(user_input)

        return f"Audio saved as {filename}. GPT says: {gpt_reply}"