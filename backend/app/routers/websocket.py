from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
from datetime import datetime
from app.managers.connection_manager import manager
from app.models.websocket import WSRequest, WebSocketMessage
from app.services.audio_service import chat, process_audio
from app.core.logger import logger

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # クエリパラメータから client_id を取得
    client_id = websocket.query_params.get("client_id", f"client_{datetime.now().timestamp()}")
    logger.info(f"WebSocket接続開始 - client_id: {client_id}")
    
    # 接続前のConnectionManager状態をログ出力
    pre_connect_state = manager.get_state_info()
    logger.info(f"WebSocket接続前のConnectionManager状態: {pre_connect_state}")
    
    await manager.connect(websocket, client_id)
    
    # 接続後のConnectionManager状態をログ出力
    post_connect_state = manager.get_state_info()
    logger.info(f"WebSocket接続後のConnectionManager状態: {post_connect_state}")

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")
            
            logger.info(f"WebSocketメッセージ受信 - client_id: {client_id}, type: {msg_type}")

            if msg_type == "set_animal":
                # 手動での動物設定（バックアップとして残しておく）
                friend = data.get("animal_type", "default")
                manager.set_friend(client_id, friend)
                logger.info(f"friend を手動設定: {friend}")
                await manager.send_message(client_id, WebSocketMessage(type="text", data=f"{friend}の設定が完了しました。会話を始めましょう！").dict())

            elif msg_type == "message":
                content = data.get("content", "")
                # 現在の会話相手を取得
                friend = manager.get_friend(client_id)
                logger.info(f"メッセージ受信: {content} (相手: {friend})")
                
                # 現在の接続状態をログ出力
                current_state = manager.get_state_info()
                logger.info(f"メッセージ処理時のConnectionManager状態: {current_state}")
                
                # 会話相手が設定されていない場合はデフォルト値を使用
                if not friend or friend == "default":
                    logger.warning(f"クライアント {client_id} の会話相手が設定されていません。デフォルト値を使用します。")
                    await manager.send_message(
                        client_id, 
                        WebSocketMessage(
                            type="text", 
                            data="会話相手が設定されていません。まずは動物を識別してください。"
                        ).dict()
                    )
                    continue
                
                text, audio_b64 = chat(content, friend)
                # テキスト
                await manager.send_message(client_id, WebSocketMessage(type="text", data=text).dict())
                # 音声
                await manager.send_message(client_id, WebSocketMessage(type="audio", data=audio_b64, format="mp3").dict())

            elif msg_type == "audio":
                audio_b64 = data.get("data", "")
                filename = f"audio_{datetime.now().timestamp()}.mp3"
                # 現在の会話相手を取得
                friend = manager.get_friend(client_id)
                
                # 会話相手が設定されていない場合はデフォルト値を使用
                if not friend or friend == "default":
                    logger.warning(f"クライアント {client_id} の会話相手が設定されていません。デフォルト値を使用します。")
                    await manager.send_message(
                        client_id, 
                        WebSocketMessage(
                            type="text", 
                            data="会話相手が設定されていません。まずは動物を識別してください。"
                        ).dict()
                    )
                    continue
                    
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