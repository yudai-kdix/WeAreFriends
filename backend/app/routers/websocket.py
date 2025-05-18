# app/services/websocket.py

import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
from datetime import datetime
from app.managers.connection_manager import manager
from app.models.websocket import WSRequest, WebSocketMessage
from app.services.audio_service import chat as audio_chat, process_audio as audio_process
from app.core.logger import logger
from app.services.image_service import save_ws_image, ImageProcessor


router = APIRouter()

# 各クライアントの追跡状態を保存する辞書
tracking_status = {}  # {client_id: {"active": bool, "animal_type": str, "last_detection": dict}}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # クエリパラメータから client_id を取得
    client_id = websocket.query_params.get("client_id", f"client_{datetime.now().timestamp()}")
    logger.info(f"WebSocket接続開始 - client_id: {client_id}")
    
    await manager.connect(websocket, client_id)
    
    # 追跡状態を初期化
    tracking_status[client_id] = {
        "active": False,
        "animal_type": None,
        "last_detection": None
    }

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
                await manager.send_message(
                    client_id,
                    WebSocketMessage(
                        type="text",
                        data=f"{friend}の設定が完了しました。会話を始めましょう！"
                    ).dict()
                )
                
            # 既存の画像処理 - 非追跡用
            elif msg_type == "image" and not tracking_status[client_id]["active"]:
                logger.info(f"画像受信: 通常処理")
                # 1. 画像保存
                filename = f"image_{datetime.now().timestamp()}.jpg"
                image_path = save_ws_image(data.get("data"), filename)
                
                # 既存のImageProcessorを使用してバウンディングボックスを検出
                processor = ImageProcessor()
                detection_result = processor.detect_top_box(image_path, conf_threshold=0.3)
                
                # 結果をクライアントに送信
                if detection_result:
                    # 検出結果をフロントエンドの期待する形式に変換
                    bbox = detection_result["bbox"]
                    
                    # 画像サイズを取得して正規化
                    import cv2
                    img = cv2.imread(image_path)
                    if img is not None:
                        height, width = img.shape[:2]
                        normalized_bbox = {
                            "x": bbox["x"] / width,
                            "y": bbox["y"] / height,
                            "width": bbox["width"] / width,
                            "height": bbox["height"] / height
                        }
                    else:
                        # 画像読み込みに失敗した場合のフォールバック
                        normalized_bbox = {
                            "x": bbox["x"] / 1000,  # 仮の値
                            "y": bbox["y"] / 1000,
                            "width": bbox["width"] / 1000,
                            "height": bbox["height"] / 1000
                        }
                    os.remove(image_path)
                    await manager.send_message(
                        client_id,
                        WebSocketMessage(
                            type="bbox", 
                            data=json.dumps(normalized_bbox)
                        ).dict()
                    )
                
                # 3. WebSocket返信は既存の処理を維持
                
            # 追加: 追跡モードでの画像処理
            elif msg_type == "image" and tracking_status[client_id]["active"]:
                logger.info(f"画像受信: 追跡モード")
                # 1. 画像保存
                filename = f"track_{datetime.now().timestamp()}.jpg"
                image_path = save_ws_image(data.get("data"), filename)
                
                # 2. ImageProcessorを使用して物体を検出
                processor = ImageProcessor()
                detection_result = processor.detect_top_box(image_path, conf_threshold=0.3)
                
                if detection_result:
                    # 検出結果をフロントエンドの期待する形式に変換
                    bbox = detection_result["bbox"]
                    label = detection_result["label"]
                    confidence = detection_result["confidence"]
                    
                    # 動物タイプのフィルタリング（オプション）
                    target_animal = tracking_status[client_id]["animal_type"]
                    
                    # 画像サイズを取得して正規化
                    import cv2
                    img = cv2.imread(image_path)
                    if img is not None:
                        height, width = img.shape[:2]
                        normalized_bbox = {
                            "x": bbox["x"] / width,
                            "y": bbox["y"] / height,
                            "width": bbox["width"] / width,
                            "height": bbox["height"] / height
                        }
                    else:
                        # 画像読み込みに失敗した場合のフォールバック
                        normalized_bbox = {
                            "x": bbox["x"] / 1000,  # 仮の値
                            "y": bbox["y"] / 1000,
                            "width": bbox["width"] / 1000,
                            "height": bbox["height"] / 1000
                        }
                    
                    # 検出結果を保存
                    tracking_status[client_id]["last_detection"] = {
                        "label": label,
                        "confidence": confidence,
                        "bbox": normalized_bbox
                    }
                    
                    # クライアントに追跡結果を送信
                    message_dict = {
                        "type": "tracking_result",
                        "object_name": label,
                        "confidence": confidence,
                        "boundingBox": normalized_bbox
                    }
                    
                    await websocket.send_text(json.dumps(message_dict))
                
                elif tracking_status[client_id]["last_detection"]:
                    # 検出失敗時に最後の結果を使用
                    last_detection = tracking_status[client_id]["last_detection"]
                    
                    # 信頼度を下げて送信
                    message_dict = {
                        "type": "tracking_result",
                        "object_name": last_detection["label"],
                        "confidence": last_detection["confidence"] * 0.8,  # 信頼度を下げる
                        "boundingBox": last_detection["bbox"]
                    }
                    
                    await websocket.send_text(json.dumps(message_dict))
                
                else:
                    # 検出失敗かつ過去の検出結果もない場合
                    message_dict = {
                        "type": "tracking_status",
                        "status": "error",
                        "message": "追跡対象を検出できませんでした"
                    }
                    
                    await websocket.send_text(json.dumps(message_dict))

            # 追加: 追跡開始リクエスト
            elif msg_type == "start_tracking":
                animal_type = data.get("animal_type")
                if not animal_type:
                    message_dict = {
                        "type": "tracking_status",
                        "status": "error",
                        "message": "追跡対象の動物が指定されていません"
                    }
                    await websocket.send_text(json.dumps(message_dict))
                    continue
                
                # 追跡状態を更新
                tracking_status[client_id]["active"] = True
                tracking_status[client_id]["animal_type"] = animal_type
                
                # 友達情報も更新（会話機能でも同じ動物を使用するため）
                manager.set_friend(client_id, animal_type)
                
                logger.info(f"追跡開始: client_id={client_id}, animal={animal_type}")
                
                # 追跡開始通知
                message_dict = {
                    "type": "tracking_status",
                    "status": "starting",
                    "message": f"{animal_type}の追跡を開始します"
                }
                await websocket.send_text(json.dumps(message_dict))

            # 追加: 追跡停止リクエスト
            elif msg_type == "stop_tracking":
                # 追跡状態を更新
                tracking_status[client_id]["active"] = False
                
                logger.info(f"追跡停止: client_id={client_id}")
                
                # 追跡停止通知
                message_dict = {
                    "type": "tracking_status",
                    "status": "stopped",
                    "message": "追跡を停止しました"
                }
                await websocket.send_text(json.dumps(message_dict))

            elif msg_type == "message":
                content = data.get("content", "")
                # 現在の会話相手を取得
                friend = manager.get_friend(client_id)
                logger.info(f"メッセージ受信: {content} (相手: {friend})")

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

                # chat を呼ぶ際に session_id と friend を渡す
                text, audio_b64 = audio_chat(
                    content,
                    session_id=client_id,
                    friend=friend
                )

                # テキスト
                await manager.send_message(
                    client_id,
                    WebSocketMessage(type="text", data=text).dict()
                )
                # 音声
                await manager.send_message(
                    client_id,
                    WebSocketMessage(type="audio", data=audio_b64, format="mp3").dict()
                )

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

                # process_audio を呼ぶ際にも session_id と friend を渡す
                text = audio_process(
                    audio_b64,
                    filename,
                    session_id=client_id,
                    friend=friend
                )
                await manager.send_message(
                    client_id,
                    WebSocketMessage(type="text", data=text).dict()
                )

            else:
                logger.warning(f"未知のタイプ: {msg_type}")
                await manager.send_message(
                    client_id,
                    WebSocketMessage(type="text", data=f"未知のメッセージタイプです: {msg_type}").dict()
                )

    except WebSocketDisconnect:
        # クライアント切断時に追跡状態をクリーンアップ
        if client_id in tracking_status:
            del tracking_status[client_id]
        manager.disconnect(client_id)
        logger.info(f"WebSocket切断: {client_id}")
    except Exception as e:
        logger.error(f"WebSocketエラー: {e}")
        # エラー時も追跡状態をクリーンアップ
        if client_id in tracking_status:
            del tracking_status[client_id]
        manager.disconnect(client_id)