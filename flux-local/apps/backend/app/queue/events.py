"""In-memory pub/sub for live job progress (feeds the WebSocket endpoint).

Single-process local design. For the multi-user Valkey path this is replaced by
a pub/sub channel, but the public API (subscribe / publish) stays the same.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Optional


@dataclass
class JobEvent:
    job_id: str
    type: str  # "progress" | "completed" | "failed" | "running"
    step: int = 0
    total_steps: int = 0
    progress: float = 0.0
    image_ids: list[str] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue[JobEvent]]] = defaultdict(set)

    def subscribe(self, job_id: str) -> "asyncio.Queue[JobEvent]":
        q: asyncio.Queue[JobEvent] = asyncio.Queue(maxsize=256)
        self._subs[job_id].add(q)
        return q

    def unsubscribe(self, job_id: str, q: "asyncio.Queue[JobEvent]") -> None:
        subs = self._subs.get(job_id)
        if subs:
            subs.discard(q)
            if not subs:
                self._subs.pop(job_id, None)

    def publish(self, event: JobEvent) -> None:
        for q in list(self._subs.get(event.job_id, ())):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # drop progress ticks under backpressure; terminal events
                #      are rare enough to not fill the queue in practice.


event_bus = EventBus()
