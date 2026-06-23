"""Batch editing: apply the same edit instruction to multiple uploaded images.

Each image is enqueued as an independent Job so progress tracking and storage
work identically to single-image edits. Returns a list of job_ids in order.
The queue serializes execution (GPU concurrency = 1) so jobs run sequentially
on the resident model without extra memory pressure.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...core.config import get_settings
from ...db.models import Job, JobKind, JobStatus, PromptHistory
from ...db.session import get_session
from ...inference.types import EditMode
from ...queue.worker import get_worker
from ...storage.uploads import UploadError, UploadStore
from ..deps import job_to_detail
from ..schemas import JobDetail

router = APIRouter(tags=["batch"])
_uploads = UploadStore(get_settings())


class BatchRef(BaseModel):
    job_ids: list[str]
    count: int


class BatchStatus(BaseModel):
    jobs: list[JobDetail]
    done: int
    total: int
    all_succeeded: bool


@router.post("/batch/edit", response_model=BatchRef, status_code=202)
async def batch_edit(
    prompt: str = Form(..., min_length=1, max_length=2000),
    mode: EditMode = Form(EditMode.INSTRUCTION),
    negative_prompt: str = Form(""),
    strength: float = Form(0.8, ge=0.0, le=1.0),
    steps: int = Form(4, ge=1, le=50),
    guidance: float = Form(3.5, ge=0.0, le=20.0),
    seed: int | None = Form(None),
    face_safe: bool = Form(False),
    images: list[UploadFile] = File(...),
    session: AsyncSession = Depends(get_session),
) -> BatchRef:
    """Apply an edit to each image independently. Max 20 images per batch."""
    if not images:
        raise HTTPException(status_code=422, detail="at least one image required")
    if len(images) > 20:
        raise HTTPException(status_code=422, detail="max 20 images per batch")

    saved_paths: list[str] = []
    try:
        for up in images:
            raw = await up.read()
            saved_paths.append(_uploads.save_image(raw))
    except UploadError as exc:
        _uploads.cleanup(*saved_paths)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    session.add(
        PromptHistory(prompt=prompt, negative_prompt=negative_prompt, kind=JobKind.EDIT)
    )

    worker = get_worker()
    job_ids: list[str] = []
    for path in saved_paths:
        job_id = str(uuid.uuid4())
        session.add(
            Job(
                id=job_id,
                kind=JobKind.EDIT,
                status=JobStatus.QUEUED,
                params={
                    "prompt": prompt,
                    "image_paths": [path],
                    "mask_path": None,
                    "mode": mode.value,
                    "negative_prompt": negative_prompt,
                    "strength": strength,
                    "steps": steps,
                    "guidance": guidance,
                    "seed": seed,
                    "face_safe": face_safe,
                },
            )
        )
        job_ids.append(job_id)

    await session.commit()
    for jid in job_ids:
        await worker.enqueue(jid)

    return BatchRef(job_ids=job_ids, count=len(job_ids))


@router.get("/batch/status", response_model=BatchStatus)
async def batch_status(
    job_ids: str,  # comma-separated
    session: AsyncSession = Depends(get_session),
) -> BatchStatus:
    """Poll status of a set of batch jobs (comma-separated job_ids)."""
    ids = [j.strip() for j in job_ids.split(",") if j.strip()]
    if not ids or len(ids) > 20:
        raise HTTPException(status_code=422, detail="provide 1–20 job ids")
    result = await session.execute(
        select(Job).options(selectinload(Job.images)).where(Job.id.in_(ids))
    )
    jobs = result.scalars().all()
    terminal = {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED}
    done = sum(1 for j in jobs if j.status in terminal)
    return BatchStatus(
        jobs=[job_to_detail(j) for j in jobs],
        done=done,
        total=len(ids),
        all_succeeded=all(j.status == JobStatus.SUCCEEDED for j in jobs),
    )
