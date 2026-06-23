"""Unit tests for the InferenceBackend abstraction and MockBackend."""
from __future__ import annotations

import io
from pathlib import Path

import pytest
from PIL import Image

from app.inference.backends.mock_backend import MockBackend
from app.inference.interface import InferenceBackend
from app.inference.registry import build_backend
from app.inference.types import EditMode, EditRequest, GenerateRequest, ProgressEvent
from app.core.config import get_settings


def test_mock_backend_is_inference_backend():
    assert isinstance(MockBackend(), InferenceBackend)


def test_load_unload():
    b = MockBackend()
    assert not b.is_loaded
    b.load()
    assert b.is_loaded
    b.unload()
    assert not b.is_loaded


def test_generate_raises_before_load():
    b = MockBackend()
    with pytest.raises(RuntimeError, match="not loaded"):
        b.generate(GenerateRequest(prompt="test"))


def test_generate_returns_correct_count():
    b = MockBackend(step_delay=0)
    b.load()
    results = b.generate(GenerateRequest(prompt="test", num_images=3, steps=2, width=64, height=64))
    assert len(results) == 3


def test_generate_deterministic_seed():
    b = MockBackend(step_delay=0)
    b.load()
    r1 = b.generate(GenerateRequest(prompt="x", seed=42, steps=1, width=64, height=64))
    r2 = b.generate(GenerateRequest(prompt="x", seed=42, steps=1, width=64, height=64))
    assert r1[0].data == r2[0].data


def test_generate_progress_callbacks():
    b = MockBackend(step_delay=0)
    b.load()
    events: list[ProgressEvent] = []
    b.generate(GenerateRequest(prompt="t", steps=4, width=64, height=64), progress=events.append)
    assert len(events) == 4
    assert events[-1].step == 4
    assert events[-1].fraction == 1.0


def test_generate_result_is_valid_png():
    b = MockBackend(step_delay=0)
    b.load()
    result = b.generate(GenerateRequest(prompt="test", steps=1, width=128, height=64))[0]
    img = Image.open(io.BytesIO(result.data))
    assert img.width == 128
    assert img.height == 64
    assert result.mime == "image/png"


def test_edit_instruction(tmp_path: Path):
    b = MockBackend(step_delay=0)
    b.load()
    src = tmp_path / "src.png"
    Image.new("RGB", (64, 64), (100, 200, 50)).save(src)
    results = b.edit(
        EditRequest(prompt="make it winter", image_paths=[str(src)], steps=2)
    )
    assert len(results) == 1
    img = Image.open(io.BytesIO(results[0].data))
    assert img.size == (64, 64)


def test_edit_inpaint_with_mask(tmp_path: Path):
    b = MockBackend(step_delay=0)
    b.load()
    src = tmp_path / "src.png"
    mask = tmp_path / "mask.png"
    Image.new("RGB", (64, 64), (10, 20, 30)).save(src)
    Image.new("L", (64, 64), 255).save(mask)  # fully white mask = edit all
    results = b.edit(
        EditRequest(
            prompt="add snow", image_paths=[str(src)], mask_path=str(mask),
            mode=EditMode.INPAINT, steps=2
        )
    )
    assert len(results) == 1


def test_edit_requires_image():
    b = MockBackend(step_delay=0)
    b.load()
    with pytest.raises(ValueError, match="at least one source image"):
        b.edit(EditRequest(prompt="test", image_paths=[]))


def test_registry_returns_mock(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "inference_backend", "mock")
    backend = build_backend(settings)
    assert backend.info().name == "mock"
