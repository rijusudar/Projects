"""Shared dependencies and small helpers for routes."""
from __future__ import annotations

from ..core.config import Settings, get_settings
from ..db.models import GeneratedImage, Job
from ..storage.image_store import ImageStore
from .schemas import ImageMeta, JobDetail

_settings = get_settings()
_store = ImageStore(_settings)


def settings_dep() -> Settings:
    return _settings


def image_store() -> ImageStore:
    return _store


def image_to_meta(img: GeneratedImage) -> ImageMeta:
    return ImageMeta(
        id=img.id,
        job_id=img.job_id,
        prompt=img.prompt,
        seed=img.seed,
        width=img.width,
        height=img.height,
        url=f"/api/v1/images/{img.id}",
        thumb_url=f"/api/v1/images/{img.id}/thumb",
        created_at=img.created_at,
    )


def job_to_detail(job: Job) -> JobDetail:
    return JobDetail(
        job_id=job.id,
        kind=job.kind.value,
        status=job.status.value,
        progress=job.progress,
        error=job.error,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        images=[image_to_meta(i) for i in job.images],
    )
