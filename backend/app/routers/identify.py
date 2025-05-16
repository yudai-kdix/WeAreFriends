from fastapi import APIRouter, HTTPException, Depends, Query, Header
from app.models.animal import IdentifyAnimalResponse
from app.services.image_service import ImageProcessor
from app.managers.connection_manager import manager
from app.models.websocket import WebSocketMessage
from app.core.config import Settings
from app.core.logger import logger
import base64
import os
from datetime import datetime
from typing import Dict, Optional


router = APIRouter()
settings = Settings()
image_processor = ImageProcessor()  # ImageProcessorのインスタンスを作成

@router.post("/identify-animal", response_model=IdentifyAnimalResponse)
async def identify_animal(
    data: Dict[str, str],
    client_id: Optional[str] = Query(None, description="WebSocketクライアントID"),
    user_agent: str = Header(None)
):
    try:
        # デバッグ情報を追加
        logger.info(f"identify-animal エンドポイントが呼ばれました - client_id: {client_id}")
        logger.info(f"User-Agent: {user_agent}")
        
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
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        logger.info(f"画像を保存しました: {filepath}")
        
        # YOLOモデルを使用して物体認識を実行（名前と信頼度を取得）
        animal_name, confidence = image_processor.detect_largest_object_with_confidence(filepath)
        
        # 応答用の動物名とデフォルト信頼度の設定
        animal = "unknown"
        final_confidence = 0.0
        
        if animal_name:
            animal = animal_name
            final_confidence = confidence
            logger.info(f"検出した動物: {animal} (信頼度: {final_confidence:.2f})")
            
            # クライアントIDが指定されている場合、WebSocket経由でそのクライアントの会話相手を更新
            if client_id:
                # 重要: クライアントIDが接続されていない場合のチェック
                if client_id not in manager.active_connections:
                    logger.warning(f"クライアント {client_id} はWebSocketに接続されていません。会話相手を設定できません。")
                    
                    # ここで直接辞書に追加することもできる（WebSocket接続がない場合でも設定を行う）
                    manager.client_friends[client_id] = animal
                    logger.info(f"WebSocket接続なしでクライアント {client_id} の会話相手を {animal} に設定しました")
                else:
                    # 通常の設定処理
                    if manager.set_friend(client_id, animal):
                        # 会話相手の設定が成功した場合、WebSocketで通知
                        notification = f"{animal}を検出しました！これから{animal}と会話します。"
                        await manager.send_message(
                            client_id, 
                            WebSocketMessage(type="text", data=notification).dict()
                        )
                    else:
                        logger.warning(f"クライアント {client_id} の会話相手の設定に失敗しました")
        else:
            logger.warning("物体を検出できませんでした。")
        
        # 最終的なConnectionManagerの状態を確認
        updated_manager_state = manager.get_state_info()
        logger.info(f"更新後のConnectionManager状態: {updated_manager_state}")
        
        # レスポンスを返す
        return {
            "animal": animal,
            "confidence": final_confidence,
            "filename": filename
        }
    
    except Exception as e:
        logger.error(f"動物識別中にエラーが発生しました: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


# デバッグ用のエンドポイントを追加
@router.get("/manager-state")
async def get_manager_state():
    """
    ConnectionManagerの現在の状態を返すデバッグ用エンドポイント
    """
    return manager.get_state_info()