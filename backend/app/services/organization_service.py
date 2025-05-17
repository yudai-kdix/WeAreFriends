from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.models import Organization
from app.models.db import OrganizationCreate, OrganizationUpdate

async def create_organization(db: AsyncSession, data: OrganizationCreate) -> Organization:
    org = Organization(name=data.name)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org

async def get_organization(db: AsyncSession, org_id: int) -> Organization | None:
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    return res.scalar_one_or_none()

async def list_organizations(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Organization]:
    res = await db.execute(select(Organization).offset(skip).limit(limit))
    return res.scalars().all()

async def update_organization(db: AsyncSession, org_id: int, data: OrganizationUpdate) -> Organization | None:
    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(**{k: v for k, v in data.dict(exclude_none=True).items()})
    )
    await db.commit()
    return await get_organization(db, org_id)

async def delete_organization(db: AsyncSession, org_id: int) -> None:
    await db.execute(delete(Organization).where(Organization.id == org_id))
    await db.commit()