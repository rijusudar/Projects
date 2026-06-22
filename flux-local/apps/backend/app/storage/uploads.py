"""Secure upload handling for the editing workflow.

Validates by CONTENT (Pillow.verify + decode), not extension; caps size and
dimensions; and re-encodes to a known format to strip any embedded payload
before the file is ever handed to the inference worker (see §9).
"""
from __future__ import annotations

import io
import uuid
from pathlib import Path

from PIL import Image

from ..core.config import Settings


class UploadError(ValueError):
    pass


class UploadStore:
    def __init__(self, settings: Settings):
        self._dir = settings.uploads_dir
        self._dir.mkdir(parents=True, exist_ok=True)
        self._max_bytes = settings.max_upload_bytes
        self._max_dim = settings.max_upload_dimension

    def save_image(self, raw: bytes) -> str:
        """Validate + re-encode an uploaded image. Returns an absolute path."""
        if not raw:
            raise UploadError("empty upload")
        if len(raw) > self._max_bytes:
            raise UploadError(
                f"file too large ({len(raw)} > {self._max_bytes} bytes)"
            )

        # 1) verify() detects truncated/corrupt files without full decode.
        try:
            Image.open(io.BytesIO(raw)).verify()
        except Exception as exc:  # noqa: BLE001
            raise UploadError(f"not a valid image: {exc}") from exc

        # 2) Re-open + decode (verify() leaves the image unusable).
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise UploadError(f"cannot decode image: {exc}") from exc

        if img.width > self._max_dim or img.height > self._max_dim:
            raise UploadError(
                f"dimensions exceed {self._max_dim}px ({img.width}x{img.height})"
            )

        # 3) Re-encode to PNG (drops EXIF / trailing data).
        out = self._dir / f"{uuid.uuid4()}.png"
        img.save(out, format="PNG")
        return str(out)

    def save_mask(self, raw: bytes, size: tuple[int, int] | None = None) -> str:
        """Validate + store a mask as grayscale PNG (white = edit region)."""
        try:
            mask = Image.open(io.BytesIO(raw)).convert("L")
        except Exception as exc:  # noqa: BLE001
            raise UploadError(f"invalid mask: {exc}") from exc
        if size:
            mask = mask.resize(size)
        out = self._dir / f"{uuid.uuid4()}.mask.png"
        mask.save(out, format="PNG")
        return str(out)

    def cleanup(self, *paths: str) -> None:
        for p in paths:
            try:
                Path(p).unlink(missing_ok=True)
            except OSError:
                pass
