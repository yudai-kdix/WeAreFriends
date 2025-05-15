from fastapi import APIRouter, HTTPException, Depends
from app.models.animal import IdentifyAnimalRequest, IdentifyAnimalResponse
from app.services.image_service import save_image, detect_animal ,ImageProcessor
from app.core.config import Settings
from app.core.logger import logger
from typing import Dict, Any, Optional
import base64
import os
from datetime import datetime


router = APIRouter()
settings = Settings()

@router.post("/identify-animal", response_model=IdentifyAnimalResponse)
async def identify_animal(data: Dict[str, str]):
    # logger.info("動物識別要求を受信")
    # try:
    #     # 画像保存
    #     filename = save_image(request.image, settings.IMAGES_DIR)
    #     # 動物検出
    #     animal, confidence = detect_animal(filename)
    #     logger.info(f"検出結果: {animal} ({confidence})")
    #     return IdentifyAnimalResponse(
    #         animal=animal,
    #         confidence=confidence,
    #         filename=filename,
    #     )
    # except Exception as e:
    #     logger.error(f"動物識別エラー: {e}")
    #     raise HTTPException(status_code=500, detail=str(e))
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
            "confidence": 0.0,
            "filename": filename
        }
    
    except Exception as e:
        logger.error(f"動物識別中にエラーが発生しました: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")