from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
from datetime import datetime
from app.managers.connection_manager import manager
from app.models.websocket import WSRequest, WebSocketMessage
from app.services.audio_service import chat, process_audio
from app.services.image_service import save_ws_image
from app.services.mock_animals import select_random_animal
from app.core.logger import logger

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # クエリパラメータから client_id を取得
    client_id = websocket.query_params.get("client_id", f"client_{datetime.now().timestamp()}")
    await manager.connect(websocket, client_id)
    friend = "default"

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "set_animal":
                friend = data.get("animal_type", friend)
                logger.info(f"friend を設定: {friend}")
                await manager.send_message(client_id, WebSocketMessage(type="text", data=f"{friend}の設定が完了しました。会話を始めましょう！").dict())

            elif msg_type == "message":
                content = data.get("content", "")
                logger.info(f"メッセージ受信: {content}")
                text, audio_b64 = chat(content, friend)
                # テキスト
                await manager.send_message(client_id, WebSocketMessage(type="text", data=text).dict())
                # 音声
                await manager.send_message(client_id, WebSocketMessage(type="audio", data=audio_b64, format="mp3").dict())

            elif msg_type == "image":
                image_b64 = data.get("data", "")
                filename = f"image_{datetime.now().timestamp()}.jpg"
                save_ws_image(image_b64, filename)
                animal = select_random_animal()
                logger.info(f"画像から検出: {animal}")
                await manager.send_message(client_id, WebSocketMessage(type="text", data=f"画像から{animal}を検出しました！").dict())

            elif msg_type == "audio":
                audio_b64 = data.get("data", "")
                filename = f"audio_{datetime.now().timestamp()}.mp3"
                text = process_audio(audio_b64, filename, friend)
                await manager.send_message(client_id, WebSocketMessage(type="text", data=text).dict())

            else:
                logger.warning(f"未知のタイプ: {msg_type}")
                await manager.send_message(client_id, WebSocketMessage(type="text", data=f"未知のメッセージタイプです: {msg_type}").dict())

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"WebSocket切断: {client_id}")
    except Exception as e:
        logger.error(f"WebSocketエラー: {e}")
        manager.disconnect(client_id)