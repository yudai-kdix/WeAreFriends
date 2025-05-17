# app/models/db.py
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

#
# Organization 用スキーマ
#
class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None

class OrganizationOut(OrganizationBase):
    id: int
    created_at: datetime
    extend_prompts: List["ExtendPromptOut"] = []  # 後述する ExtendPromptOut を参照

    class Config:
        orm_mode = True


#
# ExtendPrompt 用スキーマ
#
class ExtendPromptBase(BaseModel):
    name: str
    prompt: str

class ExtendPromptCreate(ExtendPromptBase):
    organization_id: int

class ExtendPromptUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None

class ExtendPromptOut(ExtendPromptBase):
    id: int
    created_at: datetime
    organization: OrganizationOut

    class Config:
        orm_mode = True


# 相互参照を解決
OrganizationOut.update_forward_refs()