"""The job worker: a long-lived, model-resident processor.

In local mode this runs as a background asyncio task inside the API process,
but it keeps the strict invariants from the plan:
  * the backend (model) is loaded exactly ONCE, on first start;
  * GPU work is serialized (concurrency = 1) by a single consumer loop;
  * heavy sync inference runs in a thread executor so the event loop — and
    thus the API / WebSocket progress — stays responsive;
  * progress callbacks publish to the event bus without blocking the
    denoise loop.

For the multi-user profile this same class is hosted in a separate process
that consumes from Valkey instead of an in-process asyncio.Queue.
"""
from __future__ import annotations

import asyncio
import functools
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from ..core.config import Settings
from ..core.logging import get_logger
from ..db.models import GeneratedImage, Job, JobKind, JobStatus
from ..db.session import SessionLocal
from ..inference.interface import InferenceBackend
from ..inference.registry import build_backend
from ..inference.types import (
    EditMode,
    EditRequest,
    GenerateRequest,
    ImageResult,
    ProgressEvent,
)
from ..storage.image_store import ImageStore
from .events import JobEvent, event_bus

log = get_logger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Worker:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._backend: Optional[InferenceBackend] = None
        self._store = ImageStore(settings)
        self._task: Optional[asyncio.Task] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._ready = asyncio.Event()

    # --- lifecycle ---------------------------------------------------------
    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._task = asyncio.create_task(self._run(), name="inference-worker")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._backend and self._backend.is_loaded:
            self._backend.unload()

    async def enqueue(self, job_id: str) -> None:
        await self._queue.put(job_id)

    @property
    def backend(self) -> Optional[InferenceBackend]:
        return self._backend

    async def wait_ready(self) -> None:
        await self._ready.wait()

    # --- main loop ---------------------------------------------------------
    async def _run(self) -> None:
        # Load the model ONCE, off the event loop (it can take minutes).
        self._backend = build_backend(self._settings)
        log.info("Worker loading backend %s …", self._backend.info().name)
        await asyncio.get_running_loop().run_in_executor(None, self._backend.load)
        self._ready.set()
        log.info("Backend ready.")

        while True:
            job_id = await self._queue.get()
            try:
                await self._process(job_id)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                log.exception("Unhandled error processing job %s", job_id)
            finally:
                self._queue.task_done()

    # --- progress plumbing -------------------------------------------------
    def _make_progress_cb(self, job_id: str):
        loop = self._loop
        assert loop is not None

        def cb(ev: ProgressEvent) -> None:
            # Called from the executor thread — hop back to the loop safely.
            evt = JobEvent(
                job_id=job_id,
                type="progress",
                step=ev.step,
                total_steps=ev.total_steps,
                progress=ev.fraction,
            )
            loop.call_soon_threadsafe(event_bus.publish, evt)

        return cb

    # --- job execution -----------------------------------------------------
    async def _process(self, job_id: str) -> None:
        async with SessionLocal() as session:
            job = await session.get(Job, job_id)
            if job is None:
                log.warning("Job %s vanished before processing", job_id)
                return
            job.status = JobStatus.RUNNING
            job.started_at = _now()
            await session.commit()
            kind = job.kind
            params = dict(job.params)

        event_bus.publish(JobEvent(job_id=job_id, type="running"))

        try:
            assert self._backend is not None
            cb = self._make_progress_cb(job_id)
            loop = asyncio.get_running_loop()

            if kind == JobKind.GENERATE:
                req = GenerateRequest(**params)
                fn = functools.partial(self._backend.generate, req, cb)
            else:
                req = EditRequest(
                    prompt=params["prompt"],
                    image_paths=params["image_paths"],
                    mode=EditMode(params.get("mode", "instruction")),
                    mask_path=params.get("mask_path"),
                    negative_prompt=params.get("negative_prompt", ""),
                    strength=params.get("strength", 0.8),
                    steps=params.get("steps", self._settings.default_steps),
                    guidance=params.get("guidance", self._settings.default_guidance),
                    seed=params.get("seed"),
                    face_safe=params.get("face_safe", False),
                )
                fn = functools.partial(self._backend.edit, req, cb)

            results: list[ImageResult] = await loop.run_in_executor(None, fn)
            image_ids = await self._persist(job_id, params.get("prompt", ""), results)

            async with SessionLocal() as session:
                job = await session.get(Job, job_id)
                if job:
                    job.status = JobStatus.SUCCEEDED
                    job.progress = 1.0
                    job.finished_at = _now()
                    await session.commit()

            event_bus.publish(
                JobEvent(job_id=job_id, type="completed", progress=1.0, image_ids=image_ids)
            )
            log.info("Job %s succeeded (%d image(s))", job_id, len(image_ids))

        except Exception as exc:  # noqa: BLE001
            log.exception("Job %s failed", job_id)
            async with SessionLocal() as session:
                job = await session.get(Job, job_id)
                if job:
                    job.status = JobStatus.FAILED
                    job.error = str(exc)
                    job.finished_at = _now()
                    await session.commit()
            event_bus.publish(JobEvent(job_id=job_id, type="failed", error=str(exc)))

    async def _persist(
        self, job_id: str, prompt: str, results: list[ImageResult]
    ) -> list[str]:
        image_ids: list[str] = []
        async with SessionLocal() as session:
            for res in results:
                image_id, rel, thumb = self._store.save(res.data)
                session.add(
                    GeneratedImage(
                        id=image_id,
                        job_id=job_id,
                        prompt=prompt,
                        seed=res.seed,
                        width=res.width,
                        height=res.height,
                        path=rel,
                        thumb_path=thumb,
                    )
                )
                image_ids.append(image_id)
            await session.commit()
        return image_ids


# Module-level singleton wired up in main.py's lifespan.
_worker: Optional[Worker] = None


def get_worker() -> Worker:
    if _worker is None:
        raise RuntimeError("worker not initialised")
    return _worker


def set_worker(w: Worker) -> None:
    global _worker
    _worker = w
