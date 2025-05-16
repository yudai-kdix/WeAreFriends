# app/core/prompts.py
import json
from pathlib import Path
from typing import Dict

# このファイルと同じフォルダにある prompts.json を読み込む
BASE = Path(__file__).parent
_PROMPTS: Dict[str, Dict[str, str]] = json.loads(
    (BASE / "prompts.json").read_text(encoding="utf-8")
)

# どのモデル／フレンドにも該当しない場合のフォールバック
DEFAULT_PROMPT = "あなたはフレンドです。自由に会話してください。"

def get_prompt(model: str, friend: str) -> str:
    """
    指定モデル(model)の中から friend 向けプロンプトを返します。
    見つからなければ model 内の "default" を、なければ DEFAULT_PROMPT。
    """
    by_model = _PROMPTS.get(model, {})
    if friend in by_model:
        return by_model[friend]
    if "default" in by_model:
        return by_model["default"]
    return DEFAULT_PROMPT