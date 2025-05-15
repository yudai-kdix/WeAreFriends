import os
import io
import base64
from gtts import gTTS
from openai import OpenAI
from dotenv import load_dotenv
from app.core.logger import logger

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AudioProcessor():
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
            os.makedirs("received_audios", exist_ok=True)
            file_path = os.path.join("received_audios", filename)
            with open(file_path, "wb") as f:
                f.write(file_data)
            save_message = f"Audio saved as {file_path}."
        except Exception as e:
            save_message = f"Failed to save audio: {e}"
            return save_message

        # TODO: Whisperなどでの文字起こし処理に置き換える
        logger.warning("音声の文字起こしはまだ実装されていません。仮の入力で返答を行います。")

        # 仮入力で GPT 応答
        simulated_input = "こんにちは、何が見られる？"
        reply, _ = self.chat(simulated_input)

        return f"{save_message} GPT ({self.friend}) says: {reply}"

def chat(text: str, friend: str) -> tuple[str, str]:
    """
    AudioProcessorを使って、GPTの返答テキストと音声(Base64)を生成して返す
    """
    processor = AudioProcessor(target=friend)
    reply_text, audio_b64 = processor.chat(text)
    # logger.info(f"チャット応答: {reply_text}")
    return reply_text, audio_b64


def process_audio(audio_b64: str, filename: str, friend: str) -> str:
    """
    AudioProcessorを使って、Base64音声データを保存・処理し、GPT応答テキストを返す
    """
    processor = AudioProcessor(target=friend)
    result = processor.process(audio_b64, filename)
    # logger.info(f"音声処理結果: {result}")
    return result