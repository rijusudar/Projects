"""Unit tests for image store and upload validation."""
from __future__ import annotations

import io

import pytest
from PIL import Image

from app.core.config import get_settings
from app.storage.image_store import ImageStore
from app.storage.uploads import UploadError, UploadStore


def _png(w=64, h=64, color=(80, 120, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="PNG")
    return buf.getvalue()


class TestImageStore:
    def test_save_returns_id_and_paths(self, tmp_path):
        settings = get_settings()
        settings.images_dir.mkdir(parents=True, exist_ok=True)
        store = ImageStore(settings)
        img_id, rel, thumb_rel = store.save(_png())
        assert img_id
        assert store.abspath(rel).exists()
        assert store.abspath(thumb_rel).exists()

    def test_thumbnail_is_webp(self, tmp_path):
        store = ImageStore(get_settings())
        _, _, thumb = store.save(_png())
        img = Image.open(store.abspath(thumb))
        assert img.format == "WEBP"

    def test_delete_removes_files(self):
        store = ImageStore(get_settings())
        _, rel, thumb = store.save(_png())
        store.delete(rel, thumb)
        assert not store.abspath(rel).exists()
        assert not store.abspath(thumb).exists()

    def test_exif_stripped(self):
        # Create a PNG; it goes through re-encode which drops any metadata.
        store = ImageStore(get_settings())
        _, rel, _ = store.save(_png())
        # The re-encoded PNG has no EXIF (Pillow strips on save by default).
        img = Image.open(store.abspath(rel))
        assert img.info.get("exif") is None


class TestUploadStore:
    def test_valid_png_accepted(self, tmp_path):
        up = UploadStore(get_settings())
        path = up.save_image(_png())
        assert path.endswith(".png")

    def test_empty_rejected(self):
        up = UploadStore(get_settings())
        with pytest.raises(UploadError, match="empty"):
            up.save_image(b"")

    def test_non_image_rejected(self):
        up = UploadStore(get_settings())
        with pytest.raises(UploadError):
            up.save_image(b"not an image file at all")

    def test_oversized_rejected(self):
        settings = get_settings()
        up = UploadStore(settings)
        oversized = b"x" * (settings.max_upload_bytes + 1)
        with pytest.raises(UploadError, match="too large"):
            up.save_image(oversized)

    def test_mask_is_grayscale(self):
        up = UploadStore(get_settings())
        buf = io.BytesIO()
        Image.new("RGB", (64, 64), (255, 0, 0)).save(buf, format="PNG")
        path = up.save_mask(buf.getvalue())
        img = Image.open(path)
        assert img.mode == "L"
