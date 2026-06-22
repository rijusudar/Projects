"""End-to-end backend smoke test (no GPU / no model download required).

Exercises the full pipeline with the mock backend: enqueue a generate job,
process it through the worker, persist images, and verify history. Run:

    cd apps/backend && python ../../scripts/smoke_test.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile

# Force the mock backend + an isolated temp data dir.
os.environ.setdefault("INFERENCE_BACKEND", "mock")
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="flux-smoke-")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))

from app.core.config import get_settings  # noqa: E402
from app.db.session import SessionLocal, init_db  # noqa: E402
from app.db.models import Job, JobKind, JobStatus  # noqa: E402
from app.queue.worker import Worker, set_worker  # noqa: E402
import uuid  # noqa: E402


async def main() -> int:
    settings = get_settings()
    settings.ensure_dirs()
    await init_db()

    worker = Worker(settings)
    set_worker(worker)
    await worker.start()
    await worker.wait_ready()
    print("✓ backend loaded:", worker.backend.info().name)

    job_id = str(uuid.uuid4())
    async with SessionLocal() as s:
        s.add(Job(
            id=job_id, kind=JobKind.GENERATE, status=JobStatus.QUEUED,
            params={"prompt": "a tiny robot tending a bonsai", "width": 256,
                    "height": 256, "steps": 3, "guidance": 3.5, "num_images": 2,
                    "negative_prompt": "", "seed": 42},
        ))
        await s.commit()

    await worker.enqueue(job_id)

    for _ in range(100):
        await asyncio.sleep(0.1)
        async with SessionLocal() as s:
            job = await s.get(Job, job_id)
            if job and job.status in (JobStatus.SUCCEEDED, JobStatus.FAILED):
                break

    async with SessionLocal() as s:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        res = await s.execute(
            select(Job).options(selectinload(Job.images)).where(Job.id == job_id)
        )
        job = res.scalar_one()
        assert job.status == JobStatus.SUCCEEDED, f"job failed: {job.error}"
        assert len(job.images) == 2, f"expected 2 images, got {len(job.images)}"
        for img in job.images:
            p = worker._store.abspath(img.path)
            assert p.exists() and p.stat().st_size > 0, "image not written"
        print(f"✓ generated {len(job.images)} images, seeds={[i.seed for i in job.images]}")

    await worker.stop()
    print("✓ smoke test passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
