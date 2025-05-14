import base64
import os
from openai import OpenAI
from dotenv import load_dotenv
from .media_processor import MediaProcessor

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AudioProcessor(MediaProcessor):
    def __init__(self, target="犬"):  # ← 外部からは target として受け取る
        self.friend = target  # ← 内部では friend として統一

        # 会話履歴（最初にプロンプトとして friend の人格を定義）
        self.messages = [{"role": "system", "content": self.get_prompt()}]

    def get_prompt(self) -> str:
        template = "あなたは{friend}です。語尾を{friend}のようにして会話してください。"
        return template.format(friend=self.friend)

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

        # 仮の文字起こし（将来的にWhisperと連携可能）
        user_input = "こんにちは、何が見られる？"
        gpt_reply = self.chat(user_input)

        return f"Audio saved as {filename}. GPT says: {gpt_reply}"