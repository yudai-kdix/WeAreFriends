import base64


def decode_base64(data: str) -> bytes:
    """
    Base64文字列をデコードしてバイトデータを返す
    """
    return base64.b64decode(data)


def encode_base64(data: bytes) -> str:
    """
    バイトデータをBase64文字列にエンコードして返す
    """
    return base64.b64encode(data).decode("utf-8")