from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.models import ExtendPrompt
from app.models.db import ExtendPromptCreate, ExtendPromptUpdate

async def create_extend_prompt(db: AsyncSession, data: ExtendPromptCreate) -> ExtendPrompt:
    ep = ExtendPrompt(
        name=data.name,
        prompt=data.prompt,
        organization_id=data.organization_id
    )
    db.add(ep)
    await db.commit()
    await db.refresh(ep)
    return ep

async def get_extend_prompt(db: AsyncSession, ep_id: int) -> ExtendPrompt | None:
    res = await db.execute(select(ExtendPrompt).where(ExtendPrompt.id == ep_id))
    return res.scalar_one_or_none()

async def list_extend_prompts(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ExtendPrompt]:
    res = await db.execute(select(ExtendPrompt).offset(skip).limit(limit))
    return res.scalars().all()

async def update_extend_prompt(db: AsyncSession, ep_id: int, data: ExtendPromptUpdate) -> ExtendPrompt | None:
    await db.execute(
        update(ExtendPrompt)
        .where(ExtendPrompt.id == ep_id)
        .values(**{k: v for k, v in data.dict(exclude_none=True).items()})
    )
    await db.commit()
    return await get_extend_prompt(db, ep_id)

async def delete_extend_prompt(db: AsyncSession, ep_id: int) -> None:
    await db.execute(delete(ExtendPrompt).where(ExtendPrompt.id == ep_id))
    await db.commit()