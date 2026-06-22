from __future__ import annotations

from fastapi import APIRouter

from ...core.config import get_settings
from ...inference.types import BackendInfo
from ...queue.worker import get_worker
from ..schemas import HealthInfo, ModelInfo

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthInfo)
async def health() -> HealthInfo:
    settings = get_settings()
    worker = get_worker()
    ready = worker.backend is not None and worker.backend.is_loaded
    return HealthInfo(
        status="ok",
        backend_ready=ready,
        queue_backend=settings.queue_backend,
    )


@router.get("/models", response_model=list[ModelInfo])
async def models() -> list[ModelInfo]:
    worker = get_worker()
    if worker.backend is None:
        return []
    info: BackendInfo = worker.backend.info()
    return [
        ModelInfo(
            name=info.name,
            model_id=info.model_id,
            device=info.device,
            quantization=info.quantization,
            loaded=info.loaded,
            supports_edit=info.supports_edit,
            capabilities=info.capabilities,
        )
    ]
