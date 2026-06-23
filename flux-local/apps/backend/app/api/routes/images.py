from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import GeneratedImage
from ...db.session import get_session
from ..deps import image_store

router = APIRouter(tags=["images"])


@router.get("/images/{image_id}")
async def get_image(
    image_id: str, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    img = await session.get(GeneratedImage, image_id)
    if img is None:
        raise HTTPException(status_code=404, detail="image not found")
    path = image_store().abspath(img.path)
    if not path.exists():
        raise HTTPException(status_code=410, detail="image file missing")
    return FileResponse(path, media_type="image/png")


@router.get("/images/{image_id}/thumb")
async def get_thumb(
    image_id: str, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    img = await session.get(GeneratedImage, image_id)
    if img is None:
        raise HTTPException(status_code=404, detail="image not found")
    path = image_store().abspath(img.thumb_path)
    if not path.exists():
        raise HTTPException(status_code=410, detail="thumbnail missing")
    return FileResponse(path, media_type="image/webp")


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(
    image_id: str, session: AsyncSession = Depends(get_session)
) -> None:
    img = await session.get(GeneratedImage, image_id)
    if img is None:
        raise HTTPException(status_code=404, detail="image not found")
    image_store().delete(img.path, img.thumb_path)
    await session.delete(img)
    await session.commit()
