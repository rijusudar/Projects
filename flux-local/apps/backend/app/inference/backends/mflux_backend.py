"""Real Apple Silicon backend built on `mflux` (MLX / Metal).

This is the production-on-Mac path. It is import-guarded: importing this module
on a non-Mac / no-mflux machine must not crash the app — `load()` raises a clear
error instead, and the registry falls back to the mock backend.

NOTE on the FLUX.2 Klein text encoder: it is Qwen3-based and some generic VLM
wrappers mishandle it. We rely on the text-encoder handling that `mflux` ships
with rather than wiring our own. Pin `mflux` and confirm with a smoke test
(scripts/smoke_test.py) before depending on it.

The model's NSFW/CSAM safety filters and content-provenance features are kept
intact — do not disable them.
"""
from __future__ import annotations

import io
from typing import Any, Optional

from ..interface import InferenceBackend
from ..types import (
    BackendInfo,
    EditRequest,
    GenerateRequest,
    ImageResult,
    ProgressCallback,
    ProgressEvent,
)

try:  # pragma: no cover - only importable on Apple Silicon with mflux
    from mflux.flux.flux import Flux1  # type: ignore
    from mflux.config.config import Config  # type: ignore

    _MFLUX_AVAILABLE = True
    _IMPORT_ERROR: Optional[Exception] = None
except Exception as exc:  # noqa: BLE001
    _MFLUX_AVAILABLE = False
    _IMPORT_ERROR = exc
    Flux1 = Any  # type: ignore
    Config = Any  # type: ignore


class MfluxBackend(InferenceBackend):
    name = "mflux"

    def __init__(self, model_id: str, quantization: int = 4, device: str = "mps"):
        self._model_id = model_id
        self._quant = quantization
        self._device = device
        self._flux: Any = None

    def load(self) -> None:
        if not _MFLUX_AVAILABLE:
            raise RuntimeError(
                "mflux is not available in this environment "
                f"(import failed: {_IMPORT_ERROR}). "
                "Install on Apple Silicon: `uv pip install mflux mlx`, or set "
                "INFERENCE_BACKEND=mock."
            )
        if self._flux is not None:
            return
        # mflux resolves the model alias and downloads gated weights (requires
        # `huggingface-cli login` + accepting the license). Quantization is
        # applied here so the model stays resident in quantized form.
        self._flux = Flux1.from_name(  # type: ignore[attr-defined]
            model_name=self._model_id,
            quantize=self._quant,
        )

    def unload(self) -> None:
        self._flux = None
        try:  # release Metal buffers if MLX is present
            import mlx.core as mx  # type: ignore

            mx.clear_cache()  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001
            pass

    @property
    def is_loaded(self) -> bool:
        return self._flux is not None

    def info(self) -> BackendInfo:
        return BackendInfo(
            name=self.name,
            model_id=self._model_id,
            device=self._device,
            quantization=self._quant,
            loaded=self.is_loaded,
            supports_edit=True,
            capabilities=["text-to-image", "instruction-edit", "inpaint", "lora"],
        )

    # --- helpers -----------------------------------------------------------
    def _make_config(self, *, steps: int, guidance: float, width: int, height: int):
        return Config(  # type: ignore[call-arg]
            num_inference_steps=steps,
            guidance=guidance,
            width=width,
            height=height,
        )

    def _wrap_progress(self, total: int, progress: Optional[ProgressCallback]):
        if progress is None:
            return None

        def _cb(step: int, *_a, **_k) -> None:
            progress(ProgressEvent(step=step + 1, total_steps=total))

        return _cb

    def _to_result(self, gen_image: Any, seed: int) -> ImageResult:
        pil = gen_image.image  # mflux returns an object exposing a PIL .image
        buf = io.BytesIO()
        pil.save(buf, format="PNG")
        return ImageResult(
            data=buf.getvalue(), width=pil.width, height=pil.height, seed=seed
        )

    # --- generation --------------------------------------------------------
    def generate(
        self, request: GenerateRequest, progress: Optional[ProgressCallback] = None
    ) -> list[ImageResult]:
        if self._flux is None:
            raise RuntimeError("backend not loaded")
        results: list[ImageResult] = []
        for i in range(max(1, request.num_images)):
            seed = (request.seed + i) if request.seed is not None else None
            cfg = self._make_config(
                steps=request.steps,
                guidance=request.guidance,
                width=request.width,
                height=request.height,
            )
            gen = self._flux.generate_image(
                seed=seed,
                prompt=request.prompt,
                config=cfg,
                stepwise_callback=self._wrap_progress(request.steps, progress),
            )
            results.append(self._to_result(gen, gen.seed if hasattr(gen, "seed") else (seed or 0)))
        return results

    # --- editing -----------------------------------------------------------
    def edit(
        self, request: EditRequest, progress: Optional[ProgressCallback] = None
    ) -> list[ImageResult]:
        if self._flux is None:
            raise RuntimeError("backend not loaded")
        if not request.image_paths:
            raise ValueError("edit requires at least one source image")
        cfg = self._make_config(
            steps=request.steps,
            guidance=request.guidance,
            width=0,  # mflux infers from the reference image when 0/None
            height=0,
        )
        # FLUX.2 supports multi-reference editing; pass all reference paths.
        gen = self._flux.generate_image(
            seed=request.seed,
            prompt=request.prompt,
            config=cfg,
            image_path=request.image_paths[0],
            reference_image_paths=request.image_paths[1:] or None,
            masked_image_path=request.mask_path,
            stepwise_callback=self._wrap_progress(request.steps, progress),
        )
        return [self._to_result(gen, getattr(gen, "seed", request.seed or 0))]
