import io
import base64

import numpy as np
import soundfile as sf

# fastrtc-jp の Style-Bert-VITS2 モデルをインポート
# from fastrtc_jp.text_to_speech.style_bert_vits2 import (
#     StyleBertVits2,
#     StyleBertVits2Options
# )

# # モデルの初期化（初回は HuggingFace Hub からプリセットを自動ダウンロード）
# tts_model = StyleBertVits2()  #  [oai_citation:0‡GitHub](https://github.com/route250/fastrtc-jp/tree/main)

# # オプション設定
# sbv2_opts = StyleBertVits2Options(
#     device="cpu",
#     model="jvn-F1-jp",          
#     speaker_id=0,               
#     speaker_style="Neutral"     
# )  #  [oai_citation:1‡GitHub](https://github.com/route250/fastrtc-jp/tree/main)

def synthesize_audio(reply: str) -> tuple[str, str]:
    # """
    # reply テキストを受け取り、
    # Style-Bert-VITS2 で音声合成 → base64 エンコードまで行う。
    # """
    # # 1. チャンク単位で音声生成 (sr: int, samples: np.ndarray) のリスト
    # chunks = list(tts_model.stream_tts_sync(reply, sbv2_opts))  #  [oai_citation:2‡GitHub](https://github.com/freddyaboulton/orpheus-cpp?utm_source=chatgpt.com)

    # # 2. サンプルレート取得 & 波形連結
    # sr = chunks[0][0]
    # audio = np.concatenate([chunk[1] for chunk in chunks])

    # # 3. WAV に書き込み
    # buffer = io.BytesIO()
    # sf.write(buffer, audio, sr, format="WAV")
    # buffer.seek(0)

    # # 4. base64 エンコード
    # audio_b64 = base64.b64encode(buffer.read()).decode("utf-8")

    # return reply, audio_b64
    return reply, "dummy_audio_base64_string"  # ダミーの音声データを返す