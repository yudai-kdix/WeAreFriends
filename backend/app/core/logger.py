import logging
import re

class Base64Filter(logging.Filter):
    """Base64エンコードされたデータを検出して省略するフィルター"""
    
    def __init__(self, name="", max_length=100):
        super().__init__(name)
        self.max_length = max_length
        # Base64パターン: 4の倍数長で、英数字+/=で構成される長い文字列
        self.base64_pattern = re.compile(r'[A-Za-z0-9+/=]{60,}')
    
    def filter(self, record):
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            # Base64らしき長い文字列を検出して省略する
            record.msg = self.base64_pattern.sub(
                lambda m: f"[BASE64 DATA: {len(m.group(0))} chars]", 
                record.msg
            )
        
        # args内のbase64も処理
        if hasattr(record, 'args') and record.args:
            new_args = []
            for arg in record.args:
                if isinstance(arg, str):
                    # 長いBase64文字列を検出して省略
                    arg = self.base64_pattern.sub(
                        lambda m: f"[BASE64 DATA: {len(m.group(0))} chars]",
                        arg
                    )
                new_args.append(arg)
            record.args = tuple(new_args)
        
        return True

# ロガーの設定
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# 基本設定
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

# ロガーの取得と設定
logger = logging.getLogger("we_are_friends")

# Base64フィルターを追加
logger.addFilter(Base64Filter())