from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import GeneratedImage, PromptHistory
from ...db.session import get_session
from ..deps import image_to_meta
from ..schemas import HistoryPage

router = APIRouter(tags=["history"])


@router.get("/history", response_model=HistoryPage)
async def history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> HistoryPage:
    total = await session.scalar(select(func.count(GeneratedImage.id))) or 0
    result = await session.execute(
        select(GeneratedImage)
        .order_by(GeneratedImage.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [image_to_meta(i) for i in result.scalars().all()]
    return HistoryPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/prompts")
async def prompts(
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await session.execute(
        select(PromptHistory).order_by(PromptHistory.created_at.desc()).limit(limit)
    )
    return [
        {
            "id": p.id,
            "prompt": p.prompt,
            "negative_prompt": p.negative_prompt,
            "kind": p.kind.value,
            "created_at": p.created_at.isoformat(),
        }
        for p in result.scalars().all()
    ]
