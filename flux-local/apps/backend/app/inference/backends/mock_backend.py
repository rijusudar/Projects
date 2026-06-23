"""A dependency-light backend that produces deterministic placeholder images.

Why it exists: FLUX.2 weights are gated and MLX only runs on Apple Silicon, so
neither CI nor non-Mac dev machines can exercise the real model. MockBackend
implements the full InferenceBackend contract (resident "model", progress
callbacks, generate + edit) using only Pillow, so the entire stack — queue,
API, WebSocket progress, storage, UI — is end-to-end testable everywhere.

It is selected via INFERENCE_BACKEND=mock (the default).
"""
from __future__ import annotations

import hashlib
import io
import math
import time
from typing import Optional

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from ..interface import InferenceBackend
from ..types import (
    BackendInfo,
    EditRequest,
    GenerateRequest,
    ImageResult,
    ProgressCallback,
    ProgressEvent,
)


def _seed_from(text: str, explicit: Optional[int]) -> int:
    if explicit is not None:
        return explicit
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big")


def _palette(seed: int) -> list[tuple[int, int, int]]:
    rng = seed
    cols: list[tuple[int, int, int]] = []
    for _ in range(4):
        rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
        r = (rng >> 16) & 0xFF
        g = (rng >> 8) & 0xFF
        b = rng & 0xFF
        cols.append((r, g, b))
    return cols


def _gradient(w: int, h: int, seed: int) -> Image.Image:
    """Deterministic, prompt-dependent gradient + soft blobs."""
    cols = _palette(seed)
    base = Image.new("RGB", (w, h))
    px = base.load()
    c0, c1 = cols[0], cols[1]
    for y in range(h):
        t = y / max(h - 1, 1)
        row = (
            int(c0[0] + (c1[0] - c0[0]) * t),
            int(c0[1] + (c1[1] - c0[1]) * t),
            int(c0[2] + (c1[2] - c0[2]) * t),
        )
        for x in range(w):
            px[x, y] = row
    draw = ImageDraw.Draw(base, "RGBA")
    rng = seed
    for i in range(5):
        rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
        cx = rng % w
        rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
        cy = rng % h
        rad = int(min(w, h) * (0.15 + 0.1 * math.sin(i + seed)))
        col = cols[(i % 2) + 2]
        draw.ellipse(
            [cx - rad, cy - rad, cx + rad, cy + rad],
            fill=(col[0], col[1], col[2], 90),
        )
    return base.filter(ImageFilter.GaussianBlur(radius=max(1, min(w, h) // 64)))


def _annotate(img: Image.Image, label: str, sub: str) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    draw.rectangle([0, h - 56, w, h], fill=(0, 0, 0, 110))
    try:
        font = ImageFont.load_default()
    except Exception:  # pragma: no cover
        font = None
    draw.text((10, h - 48), label[:60], fill=(255, 255, 255, 230), font=font)
    draw.text((10, h - 28), sub[:80], fill=(210, 210, 210, 230), font=font)


class MockBackend(InferenceBackend):
    name = "mock"

    def __init__(self, model_id: str = "mock/placeholder", step_delay: float = 0.12):
        self._model_id = model_id
        self._loaded = False
        self._step_delay = step_delay

    def load(self) -> None:
        # Simulate a (short) model load so worker lifecycle is exercised.
        time.sleep(0.05)
        self._loaded = True

    def unload(self) -> None:
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def info(self) -> BackendInfo:
        return BackendInfo(
            name=self.name,
            model_id=self._model_id,
            device="cpu",
            quantization=None,
            loaded=self._loaded,
            supports_edit=True,
            capabilities=["text-to-image", "instruction-edit", "inpaint"],
        )

    def _run_steps(
        self, steps: int, progress: Optional[ProgressCallback]
    ) -> None:
        for s in range(1, steps + 1):
            time.sleep(self._step_delay)
            if progress is not None:
                progress(ProgressEvent(step=s, total_steps=steps))

    def _encode(self, img: Image.Image, seed: int) -> ImageResult:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return ImageResult(
            data=buf.getvalue(), width=img.width, height=img.height, seed=seed
        )

    def generate(
        self, request: GenerateRequest, progress: Optional[ProgressCallback] = None
    ) -> list[ImageResult]:
        if not self._loaded:
            raise RuntimeError("backend not loaded")
        results: list[ImageResult] = []
        for i in range(max(1, request.num_images)):
            seed = _seed_from(request.prompt, request.seed)
            if request.seed is not None:
                seed = request.seed + i
            self._run_steps(request.steps, progress)
            img = _gradient(request.width, request.height, seed)
            _annotate(img, request.prompt, f"mock · seed {seed} · {request.steps} steps")
            results.append(self._encode(img, seed))
        return results

    def edit(
        self, request: EditRequest, progress: Optional[ProgressCallback] = None
    ) -> list[ImageResult]:
        if not self._loaded:
            raise RuntimeError("backend not loaded")
        if not request.image_paths:
            raise ValueError("edit requires at least one source image")

        src = Image.open(request.image_paths[0]).convert("RGB")
        seed = _seed_from(request.prompt + "|" + request.image_paths[0], request.seed)
        self._run_steps(request.steps, progress)

        overlay = _gradient(src.width, src.height, seed)
        if request.mask_path:
            # Apply the edit only inside the white mask region (inpaint-style).
            mask = Image.open(request.mask_path).convert("L").resize(src.size)
            edited = Image.composite(overlay, src, mask)
        else:
            # Global instruction edit: blend the whole image toward the overlay.
            edited = Image.blend(src, overlay, alpha=min(0.9, request.strength))

        _annotate(edited, request.prompt, f"mock edit · {request.mode.value}")
        return [self._encode(edited, seed)]
