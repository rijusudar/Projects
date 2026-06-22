"""Typed application configuration (single source of truth).

Reads from environment / .env via pydantic-settings and is injected into
every layer (API, queue, inference worker, storage).
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    # Mac default per spec; falls back to a local ./data dir elsewhere.
    mac = Path.home() / "Library" / "Application Support" / "flux-local"
    if os.uname().sysname == "Darwin":  # pragma: no cover - platform specific
        return mac
    return Path.cwd() / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "flux-local"
    api_bind_host: str = "127.0.0.1"
    api_bind_port: int = 8000
    # Lock CORS to the local UI origin(s).
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # --- Inference backend selection ---
    # mock  -> Pillow placeholder, runs anywhere (CI / non-Mac dev)
    # mflux -> real MLX/Metal backend on Apple Silicon
    inference_backend: Literal["mock", "mflux"] = "mock"
    model_id: str = "black-forest-labs/FLUX.2-klein-9B"
    quantization: int = 4  # int4 default on Mac; 8 for higher fidelity
    device: str = "mps"

    # --- Generation defaults ---
    default_steps: int = 4
    default_guidance: float = 3.5
    default_width: int = 512
    default_height: int = 512
    max_width: int = 1536
    max_height: int = 1536
    max_batch: int = 4

    # --- Queue ---
    queue_backend: Literal["asyncio", "valkey"] = "asyncio"
    gpu_concurrency: int = 1  # one GPU == serialize heavy jobs

    # --- Storage ---
    data_dir: Path = Field(default_factory=_default_data_dir)

    # --- Uploads (editing) ---
    max_upload_bytes: int = 25 * 1024 * 1024
    max_upload_dimension: int = 4096

    @property
    def db_path(self) -> Path:
        return self.data_dir / "flux-local.db"

    @property
    def db_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.db_path}"

    @property
    def images_dir(self) -> Path:
        return self.data_dir / "images"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    def ensure_dirs(self) -> None:
        for p in (self.data_dir, self.images_dir, self.uploads_dir):
            p.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
