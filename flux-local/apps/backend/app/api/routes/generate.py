from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import Job, JobKind, JobStatus, PromptHistory
from ...db.session import get_session
from ...queue.worker import get_worker
from ..schemas import GenerateBody, JobRef

router = APIRouter(tags=["generate"])


@router.post("/generate", response_model=JobRef, status_code=202)
async def generate(
    body: GenerateBody,
    session: AsyncSession = Depends(get_session),
) -> JobRef:
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        kind=JobKind.GENERATE,
        status=JobStatus.QUEUED,
        params=body.model_dump(),
    )
    session.add(job)
    session.add(
        PromptHistory(
            prompt=body.prompt,
            negative_prompt=body.negative_prompt,
            kind=JobKind.GENERATE,
        )
    )
    await session.commit()

    await get_worker().enqueue(job_id)
    return JobRef(job_id=job_id, status=JobStatus.QUEUED.value)
