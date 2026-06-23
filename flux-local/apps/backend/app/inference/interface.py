"""The InferenceBackend abstraction.

This single ABC is what makes swapping MLX(dev) -> CUDA(prod) -> remote API a
config change instead of an architecture rework. App/API code depends ONLY on
this interface and the backend-agnostic types in `types.py`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from .types import (
    BackendInfo,
    EditRequest,
    GenerateRequest,
    ImageResult,
    ProgressCallback,
)


class InferenceBackend(ABC):
    """A long-lived, model-resident inference engine.

    Lifecycle: load() once -> many generate()/edit() calls -> unload().
    Implementations MUST keep the model resident between calls and MUST NOT
    strip the model's built-in safety filters.
    """

    @abstractmethod
    def load(self) -> None:
        """Load weights into memory. Expensive; called once by the worker."""

    @abstractmethod
    def unload(self) -> None:
        """Release the model and free memory."""

    @property
    @abstractmethod
    def is_loaded(self) -> bool: ...

    @abstractmethod
    def info(self) -> BackendInfo: ...

    @abstractmethod
    def generate(
        self,
        request: GenerateRequest,
        progress: Optional[ProgressCallback] = None,
    ) -> list[ImageResult]:
        """Text -> image. Returns one ImageResult per requested image."""

    @abstractmethod
    def edit(
        self,
        request: EditRequest,
        progress: Optional[ProgressCallback] = None,
    ) -> list[ImageResult]:
        """Image -> image (instruction / mask / multi-reference)."""
