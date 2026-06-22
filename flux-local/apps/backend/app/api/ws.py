"""WebSocket live-progress channel: /api/v1/jobs/{job_id}/progress."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..core.logging import get_logger
from ..db.models import Job, JobStatus
from ..db.session import SessionLocal
from ..queue.events import event_bus

router = APIRouter()
log = get_logger(__name__)

_TERMINAL = {"completed", "failed"}


@router.websocket("/jobs/{job_id}/progress")
async def job_progress(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    queue = event_bus.subscribe(job_id)
    try:
        # Replay current state so a late subscriber isn't stuck waiting for the
        # next tick (or misses an already-finished job).
        async with SessionLocal() as session:
            res = await session.execute(
                select(Job).options(selectinload(Job.images)).where(Job.id == job_id)
            )
            job = res.scalar_one_or_none()
            if job is None:
                await websocket.send_json({"type": "error", "error": "job not found"})
                await websocket.close()
                return
            if job.status in (JobStatus.SUCCEEDED, JobStatus.FAILED):
                await websocket.send_json(
                    {
                        "job_id": job_id,
                        "type": "completed" if job.status == JobStatus.SUCCEEDED else "failed",
                        "progress": job.progress,
                        "image_ids": [i.id for i in job.images],
                        "error": job.error,
                    }
                )
                await websocket.close()
                return
            await websocket.send_json(
                {"job_id": job_id, "type": "status", "progress": job.progress}
            )

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
            except asyncio.TimeoutError:
                # Keepalive so proxies / browsers don't drop an idle socket.
                await websocket.send_json({"type": "ping"})
                continue

            await websocket.send_json(event.to_dict())
            if event.type in _TERMINAL:
                await websocket.close()
                return
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("WebSocket error for job %s", job_id)
    finally:
        event_bus.unsubscribe(job_id, queue)
