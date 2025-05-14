from fastapi import APIRouter, HTTPException, Depends
from app.models.animal import IdentifyAnimalRequest, IdentifyAnimalResponse
from app.services.image_service import save_image, detect_animal
from app.core.config import Settings
from app.core.logger import logger

router = APIRouter()
settings = Settings()

@router.post("/identify-animal", response_model=IdentifyAnimalResponse)
async def identify_animal(request: IdentifyAnimalRequest):
    logger.info("動物識別要求を受信")
    try:
        # 画像保存
        filename = save_image(request.image, settings.IMAGES_DIR)
        # 動物検出
        animal, confidence = detect_animal(filename)
        logger.info(f"検出結果: {animal} ({confidence})")
        return IdentifyAnimalResponse(
            animal=animal,
            confidence=confidence,
            filename=filename,
        )
    except Exception as e:
        logger.error(f"動物識別エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))