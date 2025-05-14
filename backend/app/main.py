from fastapi import FastAPI, WebSocket, HTTPException, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
import json
import base64
import random
import os
import logging
from datetime import datetime
from .image_processor import ImageProcessor
import shutil

# 既存の音声プロセッサのインポート
try:
    from .audio_processor import AudioProcessor
except ImportError:
    # 仮の音声プロセッサクラス（実際のファイルが存在しない場合用）
    class AudioProcessor:
        def __init__(self, animal=""):
            self.animal = animal
        
        def process(self, data, filename):
            return f"{self.animal}の鳴き声を検出しました！"

app = FastAPI(title="We Are Friends")

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境ではオリジンを制限することをお勧めします
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ロギングの設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 受信した画像とオーディオを保存するディレクトリの作成
os.makedirs("received_images", exist_ok=True)
os.makedirs("received_audios", exist_ok=True)

# 仮の動物リスト（実際の画像認識が実装されるまでの代用）
MOCK_ANIMALS = [
    "cat", "dog", "elephant", "bear", "zebra", 
    "giraffe", "bird", "penguin", "horse", "sheep", "cow"
]

# WebSocketクライアントを管理するクラス
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"新しいクライアント接続: {client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"クライアント切断: {client_id}")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(json.dumps(message))
            logger.info(f"メッセージ送信 to {client_id}: {message['type']}")

manager = ConnectionManager()

# デモ用HTMLページ
html = """
<!DOCTYPE html>
<html>
    <head>
        <title>We Are Friends</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <h4>画像送信（動物識別）</h4>
        <input type="file" id="imageFileInput" />
        <button onclick="sendImage()">Send Image</button>
        <h4>音声送信</h4>
        <input type="file" id="audioFileInput" />
        <button onclick="sendAudio()">Send Audio</button>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("ws://localhost:8000/ws?client_id=web_test_client");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(JSON.stringify({ type: "message", content: input.value }))
                input.value = ''
                event.preventDefault()
            }
            function sendImage() {
                var fileInput = document.getElementById("imageFileInput")
                var file = fileInput.files[0]
                if (file && file.type.startsWith("image/")) {
                    var reader = new FileReader()
                    reader.onload = function() {
                        var base64Data = reader.result.split(",")[1]
                        ws.send(JSON.stringify({ type: "image", data: base64Data, filename: file.name }))
                    }
                    reader.readAsDataURL(file)
                } else {
                    alert("Please select an image file.")
                }
            }
            function sendAudio() {
                var fileInput = document.getElementById("audioFileInput")
                var file = fileInput.files[0]
                if (file && file.type.startsWith("audio/")) {
                    var reader = new FileReader()
                    reader.onload = function() {
                        var base64Data = reader.result.split(",")[1]
                        ws.send(JSON.stringify({ type: "audio", data: base64Data, filename: file.name }))
                    }
                    reader.readAsDataURL(file)
                } else {
                    alert("Please select an audio file.")
                }
            }
        </script>
    </body>
</html>
"""

# 健康チェックエンドポイント
@app.get("/health-check")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# デモ用HTMLページ
@app.get("/")
async def get():
    return HTMLResponse(html)

# 動物識別エンドポイント
@app.post("/identify-animal")
async def identify_animal(data: Dict[str, str]):
    try:
        # Base64エンコードされた画像データを取得
        if "image" not in data:
            raise HTTPException(status_code=400, detail="Image data is required")
        
        # Base64デコード
        image_data = base64.b64decode(data["image"])
        
        # 一意のファイル名を生成
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"animal_{timestamp}.jpg"
        filepath = os.path.join("received_images", filename)
        
        # 画像を保存
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        logger.info(f"画像を保存しました: {filepath}")
        
        # 仮の画像認識処理（ランダムな動物を返す）
        image_processor = ImageProcessor()
        animal = image_processor.detect_largest_object()
        
        # レスポンスを返す
        return {
            "animal": animal,
            "confidence": None,
            "filename": filename
        }
    
    except Exception as e:
        logger.error(f"動物識別中にエラーが発生しました: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

# # アップロードファイルでの動物識別（代替メソッド）
# @app.post("/api/identify-animal-upload")
# async def identify_animal_upload(file: UploadFile = File(...)):
#     try:
#         # アップロードされたファイルを保存
#         timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
#         filename = f"animal_{timestamp}_{file.filename}"
#         filepath = os.path.join("received_images", filename)
        
#         with open(filepath, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
        
#         logger.info(f"アップロードされた画像を保存しました: {filepath}")
        
#         # 仮の画像認識処理（ランダムな動物を返す）
#         animal = random.choice(MOCK_ANIMALS)
#         confidence = round(random.uniform(0.7, 0.98), 2)
        
#         # レスポンスを返す
#         return {
#             "animal": animal,
#             "confidence": confidence,
#             "filename": filename
#         }
    
#     except Exception as e:
#         logger.error(f"動物識別中にエラーが発生しました: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

# WebSocketエンドポイント
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = websocket.query_params.get("client_id", f"client_{datetime.now().timestamp()}")
    await manager.connect(websocket, client_id)

    friend = "default"  # ← animal_type を friend に変更

    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                message = json.loads(text_data)
                message_type = message.get("type", "")

                if message_type == "set_animal":
                    # 動物タイプの代わりに friend を設定
                    friend = message.get("animal_type", "default")
                    logger.info(f"friend を設定: {friend}")
                    await manager.send_message(client_id, {
                        "type": "text",
                        "data": f"{friend}の設定が完了しました。会話を始めましょう！"
                    })

                elif message_type == "message":
                    content = message.get("content", "")
                    logger.info(f"メッセージを受信: {content}")
                    try:
                        audio_processor = AudioProcessor(target=friend)
                        reply_text, reply_audio_b64 = audio_processor.chat(content)

                        # テキスト送信
                        await manager.send_message(client_id, {
                            "type": "text",
                            "data": reply_text
                        })

                        # logger.info(f"🎤 Audioを送信中（{client_id}）: Base64前半 → {reply_audio_b64[:100]}...")

                        # 音声(Base64)送信
                        await manager.send_message(client_id, {
                            "type": "audio",
                            "data": reply_audio_b64,
                            "format": "mp3"
                        })

                    except Exception as e:
                        logger.error(f"AudioProcessor エラー: {str(e)}")
                        await manager.send_message(client_id, {
                            "type": "text",
                            "data": f"エラーが発生しました: {str(e)}"
                        })

                elif message_type == "image":
                    image_data = message.get("data", "")
                    filename = message.get("filename", f"image_{datetime.now().timestamp()}.jpg")
                    file_data = base64.b64decode(image_data)
                    filepath = os.path.join("received_images", filename)
                    with open(filepath, "wb") as f:
                        f.write(file_data)
                    logger.info(f"画像を保存しました: {filepath}")
                    friend = random.choice(MOCK_ANIMALS)  # ← animal_type ではなく friend に設定
                    await manager.send_message(client_id, {
                        "type": "text",
                        "data": f"画像から{friend}を検出しました！会話を始めましょう。"
                    })

                elif message_type == "audio":
                    audio_data = message.get("data", "")
                    filename = message.get("filename", f"audio_{datetime.now().timestamp()}.mp3")
                    file_data = base64.b64decode(audio_data)
                    filepath = os.path.join("received_audios", filename)
                    with open(filepath, "wb") as f:
                        f.write(file_data)
                    logger.info(f"音声を保存しました: {filepath}")
                    try:
                        audio_processor = AudioProcessor(target=friend)
                        result = audio_processor.process(data=audio_data, filename=filename)
                        await manager.send_message(client_id, {
                            "type": "text",
                            "data": result
                        })
                    except Exception as e:
                        logger.error(f"音声処理中にエラーが発生しました: {str(e)}")
                        await manager.send_message(client_id, {
                            "type": "text",
                            "data": f"音声処理中にエラーが発生しました: {str(e)}"
                        })

                else:
                    logger.warning(f"未知のメッセージタイプ: {message_type}")
                    await manager.send_message(client_id, {
                        "type": "text",
                        "data": f"未知のメッセージタイプです: {message_type}"
                    })

            except json.JSONDecodeError:
                logger.error(f"JSON解析エラー: {text_data}")
                await manager.send_message(client_id, {
                    "type": "text",
                    "data": "メッセージの形式が正しくありません。JSONフォーマットを確認してください。"
                })

    except Exception as e:
        logger.error(f"WebSocket接続エラー: {str(e)}")

    finally:
        manager.disconnect(client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)