from pydantic import BaseModel
from typing import Optional

class WSRequest(BaseModel):
    type: str
    content: Optional[str] = None
    data: Optional[str] = None
    filename: Optional[str] = None
    animal_type: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    data: str
    format: Optional[str] = None