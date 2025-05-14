import base64
import io
import os

from dotenv import load_dotenv
from gtts import gTTS
from openai import OpenAI

from .media_processor import MediaProcessor

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AudioProcessor(MediaProcessor):
    def __init__(self, target: str = "犬"):
        self.friend: str = target
        self.messages: list[dict[str, str]] = [
            {"role": "system", "content": self.get_prompt()}
        ]

    # 対話相手のキャラクター設定に基づいたシステムプロンプトを生成します。
    def get_prompt(self) -> str:
        template = "あなたは{friend}です。語尾を{friend}のようにして会話してください。"
        return template.format(friend=self.friend)

    # ユーザーの入力に基づいてGPTモデルと会話し、応答テキストと音声データを生成します。
    #
    # Args:
    #     user_input: ユーザーからの入力テキスト。
    #
    # Returns:
    #     GPTからの応答テキストと、その応答を音声合成したBase64エンコード文字列のタプル。
    def chat(self, user_input: str) -> tuple[str, str]:
        self.messages.append({"role": "user", "content": user_input})

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=self.messages
        )
        reply: str = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": reply})

        # テキストを音声に変換
        tts = gTTS(text=reply, lang="ja")
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        audio_b64 = base64.b64encode(buffer.read()).decode("utf-8")

        return reply, audio_b64

    # 受信した音声データを処理し、GPTとの対話結果を返します。
    # 現状、受信した音声データの文字起こしは行わず、固定のユーザー入力を使用します。
    #
    # Args:
    #     data: Base64エンコードされた音声データ。
    #     filename: 受信した音声ファイルの元の名前。
    #
    # Returns:
    #     処理結果を示すメッセージ文字列。
    def process(self, data: str, filename: str) -> str:
        # 音声データをファイルとして保存
        try:
            file_data = base64.b64decode(data)
            # 'received_audios' ディレクトリが存在することを確認
            os.makedirs("received_audios", exist_ok=True)
            file_path = os.path.join("received_audios", filename)
            with open(file_path, "wb") as f:
                f.write(file_data)
            save_message = f"Audio saved as {file_path}."
        except Exception as e:
            save_message = f"Failed to save audio: {e}"
            # エラーが発生した場合でも、以降のチャット処理は試みる（設計による）

        # 仮の文字起こし（将来的にWhisperなどと連携）
        # 現在は固定のユーザー入力を使用
        simulated_user_input = "こんにちは、何が見られる？"

        gpt_reply_text, _ = self.chat(simulated_user_input) # audio_b64_data は現時点では未使用

        return f"{save_message} GPT ({self.friend}) says: {gpt_reply_text}"