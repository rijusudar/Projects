"""Backend-agnostic request/result types.

These types deliberately contain NO MLX / torch / diffusers objects so that
nothing framework-specific leaks above the InferenceBackend boundary.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


class EditMode(str, Enum):
    INSTRUCTION = "instruction"      # "make the sky purple"
    STYLE_TRANSFER = "style_transfer"
    BACKGROUND = "background"          # replace background
    INPAINT = "inpaint"               # masked object add/remove
    OUTPAINT = "outpaint"


@dataclass(slots=True)
class GenerateRequest:
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 4
    guidance: float = 3.5
    seed: Optional[int] = None
    num_images: int = 1


@dataclass(slots=True)
class EditRequest:
    prompt: str
    # Absolute path(s) to the source image(s). Multi-reference editing
    # accepts more than one reference image.
    image_paths: list[str]
    mode: EditMode = EditMode.INSTRUCTION
    # Optional mask (white = edit region) as an absolute path.
    mask_path: Optional[str] = None
    negative_prompt: str = ""
    strength: float = 0.8
    steps: int = 4
    guidance: float = 3.5
    seed: Optional[int] = None
    # When True, preserve faces (face-safe editing). Backends should keep
    # the model's safety filters intact regardless of this flag.
    face_safe: bool = False


@dataclass(slots=True)
class ImageResult:
    """One produced image, returned as raw PNG bytes plus metadata."""

    data: bytes
    width: int
    height: int
    seed: int
    mime: str = "image/png"


@dataclass(slots=True)
class ProgressEvent:
    step: int
    total_steps: int
    # Optional low-res preview (PNG bytes) if the backend can supply one.
    preview: Optional[bytes] = None

    @property
    def fraction(self) -> float:
        return self.step / self.total_steps if self.total_steps else 0.0


# Backends invoke this synchronously inside the denoise loop. Implementations
# must be cheap and non-blocking.
ProgressCallback = Callable[[ProgressEvent], None]


@dataclass(slots=True)
class BackendInfo:
    name: str
    model_id: str
    device: str
    quantization: Optional[int]
    loaded: bool
    supports_edit: bool
    capabilities: list[str] = field(default_factory=list)
