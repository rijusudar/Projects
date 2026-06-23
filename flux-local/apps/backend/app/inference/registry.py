"""Backend factory: maps config -> a concrete InferenceBackend instance."""
from __future__ import annotations

from ..core.config import Settings
from ..core.logging import get_logger
from .backends.mock_backend import MockBackend
from .interface import InferenceBackend

log = get_logger(__name__)


def build_backend(settings: Settings) -> InferenceBackend:
    choice = settings.inference_backend
    if choice == "mflux":
        # Imported lazily so non-Mac environments never pay the import cost.
        from .backends.mflux_backend import MfluxBackend

        log.info("Using MfluxBackend model=%s q=%s", settings.model_id, settings.quantization)
        return MfluxBackend(
            model_id=settings.model_id,
            quantization=settings.quantization,
            device=settings.device,
        )

    log.info("Using MockBackend (placeholder images). Set INFERENCE_BACKEND=mflux on Apple Silicon.")
    return MockBackend(model_id=settings.model_id)
