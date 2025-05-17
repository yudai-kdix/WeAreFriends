# app/services/get_extend_prompt_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ExtendPrompt

async def get_prompt_for_label(
    db: AsyncSession,
    organization_id: int,
    label: str
) -> str:
    """
    指定されたラベル(label)とorganization_idから、該当するExtendPromptのプロンプトを返す。
    
    - organization_id に紐づく ExtendPrompt テーブルから、name が label と一致するレコードを検索
    - 見つかったらその prompt を返す
    - 見つからない場合は ValueError を発生させる

    :param db: AsyncSession
    :param organization_id: 組織ID
    :param label: 識別結果の文字列
    :return: プロンプト文字列
    :raises ValueError: 該当するプロンプトが存在しない場合
    """
    stmt = select(ExtendPrompt).where(
        ExtendPrompt.organization_id == organization_id,
        ExtendPrompt.name == label
    )
    result = await db.execute(stmt)
    prompt_obj = result.scalars().first()
    if prompt_obj:
        return prompt_obj.prompt

    # 見つからない場合はエラーを返す
    raise ValueError(f"No prompt found for label '{label}' in organization {organization_id}")