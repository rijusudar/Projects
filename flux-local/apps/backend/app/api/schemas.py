"""Pydantic request/response models for the v1 API."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from ..inference.types import EditMode


# --- requests ----------------------------------------------------------------
class GenerateBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    negative_prompt: str = Field(default="", max_length=2000)
    width: int = Field(default=512, ge=64, le=1536)
    height: int = Field(default=512, ge=64, le=1536)
    steps: int = Field(default=4, ge=1, le=50)
    guidance: float = Field(default=3.5, ge=0.0, le=20.0)
    seed: Optional[int] = Field(default=None, ge=0)
    num_images: int = Field(default=1, ge=1, le=4)

    @field_validator("width", "height")
    @classmethod
    def _multiple_of_8(cls, v: int) -> int:
        if v % 8 != 0:
            raise ValueError("width/height must be a multiple of 8")
        return v


class EditBody(BaseModel):
    """Used with multipart/form-data; images are uploaded as files."""

    prompt: str = Field(min_length=1, max_length=2000)
    mode: EditMode = EditMode.INSTRUCTION
    negative_prompt: str = Field(default="", max_length=2000)
    strength: float = Field(default=0.8, ge=0.0, le=1.0)
    steps: int = Field(default=4, ge=1, le=50)
    guidance: float = Field(default=3.5, ge=0.0, le=20.0)
    seed: Optional[int] = Field(default=None, ge=0)
    face_safe: bool = False


# --- responses ---------------------------------------------------------------
class JobRef(BaseModel):
    job_id: str
    status: str


class ImageMeta(BaseModel):
    id: str
    job_id: str
    prompt: str
    seed: int
    width: int
    height: int
    url: str
    thumb_url: str
    created_at: datetime


class JobDetail(BaseModel):
    job_id: str
    kind: str
    status: str
    progress: float
    error: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    images: list[ImageMeta]


class HistoryPage(BaseModel):
    items: list[ImageMeta]
    total: int
    limit: int
    offset: int


class ModelInfo(BaseModel):
    name: str
    model_id: str
    device: str
    quantization: Optional[int]
    loaded: bool
    supports_edit: bool
    capabilities: list[str]


class HealthInfo(BaseModel):
    status: str
    backend_ready: bool
    queue_backend: str
