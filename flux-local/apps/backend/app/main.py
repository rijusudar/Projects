"""FastAPI application entrypoint.

Wires the API, starts the model-resident worker in the app lifespan (local
asyncio profile), and serves results. Binds to 127.0.0.1 by default (§9).
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import batch, edit, generate, health, history, images, jobs
from .api import ws
from .core.config import get_settings
from .core.logging import get_logger
from .db.session import init_db
from .queue.worker import Worker, set_worker

log = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_dirs()
    await init_db()

    worker = Worker(settings)
    set_worker(worker)
    await worker.start()
    log.info("API up on %s:%s (backend=%s, queue=%s)",
             settings.api_bind_host, settings.api_bind_port,
             settings.inference_backend, settings.queue_backend)
    try:
        yield
    finally:
        await worker.stop()


app = FastAPI(
    title="flux-local",
    version="1.0.0",
    description="Local-first image generation & editing API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(health.router, prefix=API)
app.include_router(generate.router, prefix=API)
app.include_router(edit.router, prefix=API)
app.include_router(jobs.router, prefix=API)
app.include_router(history.router, prefix=API)
app.include_router(images.router, prefix=API)
app.include_router(batch.router, prefix=API)
app.include_router(ws.router, prefix=API)


@app.get("/")
async def root() -> dict:
    return {"app": settings.app_name, "docs": "/docs", "api": API}
