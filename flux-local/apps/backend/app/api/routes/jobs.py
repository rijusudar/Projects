from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...db.models import Job
from ...db.session import get_session
from ..deps import job_to_detail
from ..schemas import JobDetail

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobDetail)
async def get_job(
    job_id: str, session: AsyncSession = Depends(get_session)
) -> JobDetail:
    result = await session.execute(
        select(Job).options(selectinload(Job.images)).where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job_to_detail(job)
