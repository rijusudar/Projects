"""Filesystem image + thumbnail store.

Layout:  images/<yyyy>/<mm>/<uuid>.png  +  <uuid>.thumb.webp
Security: every image is re-encoded on write, which strips EXIF / embedded
payloads (see §9). Uploads are validated separately in storage.uploads.
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from ..core.config import Settings

THUMB_MAX = 384


class ImageStore:
    def __init__(self, settings: Settings):
        self._root = settings.images_dir
        self._root.mkdir(parents=True, exist_ok=True)

    def _shard(self) -> Path:
        now = datetime.now(timezone.utc)
        d = self._root / f"{now:%Y}" / f"{now:%m}"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save(self, png_bytes: bytes) -> tuple[str, str, str]:
        """Persist PNG bytes + a WebP thumbnail.

        Returns (image_id, rel_image_path, rel_thumb_path).
        """
        image_id = str(uuid.uuid4())
        shard = self._shard()

        # Re-encode the full image (strips metadata).
        img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
        full_path = shard / f"{image_id}.png"
        img.save(full_path, format="PNG")

        # Thumbnail.
        thumb = img.copy()
        thumb.thumbnail((THUMB_MAX, THUMB_MAX))
        thumb_path = shard / f"{image_id}.thumb.webp"
        thumb.save(thumb_path, format="WEBP", quality=80, method=4)

        return (
            image_id,
            str(full_path.relative_to(self._root)),
            str(thumb_path.relative_to(self._root)),
        )

    def abspath(self, rel_path: str) -> Path:
        return self._root / rel_path

    def delete(self, rel_image_path: str, rel_thumb_path: str) -> None:
        for rel in (rel_image_path, rel_thumb_path):
            p = self._root / rel
            if p.exists():
                p.unlink()
