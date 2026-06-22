from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...db.models import Job, JobKind, JobStatus, PromptHistory
from ...db.session import get_session
from ...inference.types import EditMode
from ...queue.worker import get_worker
from ...storage.uploads import UploadError, UploadStore
from ..schemas import JobRef

router = APIRouter(tags=["edit"])
_uploads = UploadStore(get_settings())


@router.post("/edit", response_model=JobRef, status_code=202)
async def edit(
    prompt: str = Form(..., min_length=1, max_length=2000),
    mode: EditMode = Form(EditMode.INSTRUCTION),
    negative_prompt: str = Form(""),
    strength: float = Form(0.8, ge=0.0, le=1.0),
    steps: int = Form(4, ge=1, le=50),
    guidance: float = Form(3.5, ge=0.0, le=20.0),
    seed: int | None = Form(None),
    face_safe: bool = Form(False),
    # Primary image is required; additional references enable multi-reference
    # editing. An optional mask drives inpaint / object add-remove.
    images: list[UploadFile] = File(...),
    mask: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> JobRef:
    if not images:
        raise HTTPException(status_code=422, detail="at least one image is required")

    saved_paths: list[str] = []
    mask_path: str | None = None
    try:
        for up in images:
            raw = await up.read()
            saved_paths.append(_uploads.save_image(raw))
        if mask is not None:
            mask_raw = await mask.read()
            mask_path = _uploads.save_mask(mask_raw)
    except UploadError as exc:
        _uploads.cleanup(*saved_paths, *( [mask_path] if mask_path else [] ))
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        kind=JobKind.EDIT,
        status=JobStatus.QUEUED,
        params={
            "prompt": prompt,
            "image_paths": saved_paths,
            "mask_path": mask_path,
            "mode": mode.value,
            "negative_prompt": negative_prompt,
            "strength": strength,
            "steps": steps,
            "guidance": guidance,
            "seed": seed,
            "face_safe": face_safe,
        },
    )
    session.add(job)
    session.add(PromptHistory(prompt=prompt, negative_prompt=negative_prompt, kind=JobKind.EDIT))
    await session.commit()

    await get_worker().enqueue(job_id)
    return JobRef(job_id=job_id, status=JobStatus.QUEUED.value)
