from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json

from app.db.session import get_db
from app.db.models import Organization
from app.services.extend_prompt_service import create_extend_prompt
from app.models.db import ExtendPromptCreate, ExtendPromptOut
from pydantic import BaseModel, ValidationError
from app.utils.file_utils import save_file



class PromptItem(BaseModel):
    name: str
    prompt: str

router = APIRouter()

@router.post("/extend_prompt", response_model=List[ExtendPromptOut])
async def extend_prompt(
    organization_name: str = Form(...),
    items: str = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    ExtendPromptを追加するエンドポイント
    - organization_name: 組織名
    - items: JSON文字列 [{"name":"...","prompt":"..."}, ...]
    - files: name に対応した ZIP ファイルリスト
    """
    # JSONパース＆型検証
    try:
        raw = json.loads(items)
        prompt_items = [PromptItem(**itm) for itm in raw]
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid items format: {e}")

    # 書式チェック
    if len(prompt_items) != len(files):
        raise HTTPException(status_code=400, detail="ItemsとFilesの数が一致しません")

    # Organizationの取得または作成
    result = await db.execute(select(Organization).where(Organization.name == organization_name))
    org = result.scalar_one_or_none()
    if org is None:
        org = Organization(name=organization_name)
        db.add(org)
        await db.commit()
        await db.refresh(org)

    created_prompts = []
    for item, upload in zip(prompt_items, files):
        # ファイル名変更 & 保存
        filename = f"{item.name}.zip"
        content = await upload.read()
        save_file(content, directory="extend_prompts", filename=filename)
        
        # DB レコード作成 via サービス層
        ep_create = ExtendPromptCreate(
            name=item.name,
            prompt=item.prompt,
            organization_id=org.id
        )
        ep = await create_extend_prompt(db, ep_create)
        created_prompts.append(ep)

    return created_prompts

