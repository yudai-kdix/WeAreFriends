from pydantic import BaseModel

class IdentifyAnimalRequest(BaseModel):
    image: str  # Base64エンコードされた画像データ

class IdentifyAnimalResponse(BaseModel):
    animal: str
    confidence: float
    filename: str