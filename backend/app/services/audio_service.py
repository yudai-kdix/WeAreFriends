import os
import io
import base64
from gtts import gTTS
from openai import OpenAI
from dotenv import load_dotenv
from app.core.logger import logger
from app.core.prompts import get_prompt, DEFAULT_PROMPT

# 環境変数読み込みと GPT クライアント初期化
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AudioProcessor:
    """
    GPTと対話しつつ音声合成を行うプロセッサ。
    会話履歴を保持し、session_idごとにキャッシュされる。
    """
    def __init__(self, target: str = "犬"):
        self.friend = target
        # 使用モデル名（必要に応じて変更）
        self.model_name = "gpt-3.5-turbo"
        # prompts.json からプロンプトを取得、見つからなければデフォルトを使用
        prompt_text = get_prompt(self.model_name, self.friend)
        self.messages = [
            {"role": "system", "content": prompt_text}
        ]
        logger.info(f"AudioProcessor 初期化: friend={self.friend}, prompt={prompt_text}")

    def chat(self, user_input: str) -> tuple[str, str]:
        # 会話履歴にユーザーメッセージ追加
        self.messages.append({"role": "user", "content": user_input})
        # GPT呼び出し
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=self.messages
        )
        reply_text = response.choices[0].message.content
        # 履歴にアシスタント応答追加
        self.messages.append({"role": "assistant", "content": reply_text})
        # 音声合成
        tts = gTTS(text=reply_text, lang="ja")
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode("utf-8")
        return reply_text, audio_b64

    def process(self, data: str, filename: str) -> str:
        # 音声保存
        try:
            os.makedirs("received_audios", exist_ok=True)
            file_data = base64.b64decode(data)
            path = os.path.join("received_audios", filename)
            with open(path, "wb") as f:
                f.write(file_data)
            save_msg = f"音声を保存しました: {path}"
        except Exception as e:
            logger.error(f"音声保存失敗: {e}")
            return f"音声の保存に失敗しました: {e}"
        # 文字起こしは未実装のため仮発話
        logger.warning("文字起こし未実装: 仮入力でGPT応答を生成")
        simulated = "こんにちは、何が見られる？"
        reply, _ = self.chat(simulated)
        return f"{save_msg} | GPT ({self.friend}) says: {reply}"

# session_idごとにAudioProcessorをキャッシュ
_audio_processors: dict[str, AudioProcessor] = {}

def get_processor(session_id: str, friend: str) -> AudioProcessor:
    key = f"{session_id}:{friend}"
    if key not in _audio_processors:
        _audio_processors[key] = AudioProcessor(target=friend)
    return _audio_processors[key]


def chat(text: str, session_id: str, friend: str) -> tuple[str, str]:
    """
    指定のsession_idとfriendでGPT会話および音声合成を実行
    """
    proc = get_processor(session_id, friend)
    reply_text, audio_b64 = proc.chat(text)
    logger.info(f"チャット応答: {reply_text}")
    return reply_text, audio_b64


def process_audio(audio_b64: str, filename: str, session_id: str, friend: str) -> str:
    """
    指定のsession_idとfriendで音声保存とGPT応答を実行
    """
    proc = get_processor(session_id, friend)
    result = proc.process(audio_b64, filename)
    logger.info(f"音声処理結果: {result}")
    return result