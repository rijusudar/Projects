"""Integration tests for the FastAPI HTTP layer (mock backend, no GPU)."""
from __future__ import annotations

import io
import time

import pytest
from fastapi.testclient import TestClient
from PIL import Image


def _png(w: int = 64, h: int = 64) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (80, 120, 200)).save(buf, format="PNG")
    return buf.getvalue()


def _wait_job(client: TestClient, job_id: str, timeout: float = 10.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = client.get(f"/api/v1/jobs/{job_id}")
        j = r.json()
        if j["status"] in ("succeeded", "failed"):
            return j
        time.sleep(0.1)
    pytest.fail(f"job {job_id} did not finish within {timeout}s")


class TestHealth:
    def test_ok(self, client):
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["backend_ready"] is True

    def test_models(self, client):
        models = client.get("/api/v1/models").json()
        assert len(models) == 1
        assert models[0]["loaded"] is True


class TestGenerate:
    def test_returns_202_with_job_id(self, client):
        r = client.post("/api/v1/generate", json={
            "prompt": "neon robot", "width": 64, "height": 64, "steps": 2, "num_images": 1
        })
        assert r.status_code == 202
        assert "job_id" in r.json()

    def test_job_succeeds_with_image(self, client):
        ref = client.post("/api/v1/generate", json={
            "prompt": "cloud city", "width": 64, "height": 64, "steps": 2, "num_images": 2
        }).json()
        job = _wait_job(client, ref["job_id"])
        assert job["status"] == "succeeded"
        assert len(job["images"]) == 2
        assert job["images"][0]["width"] == 64

    def test_image_endpoint_returns_png(self, client):
        ref = client.post("/api/v1/generate", json={
            "prompt": "forest", "width": 64, "height": 64, "steps": 1, "num_images": 1
        }).json()
        job = _wait_job(client, ref["job_id"])
        img_id = job["images"][0]["id"]
        r = client.get(f"/api/v1/images/{img_id}")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    def test_thumb_endpoint_returns_webp(self, client):
        ref = client.post("/api/v1/generate", json={
            "prompt": "thumb test", "width": 64, "height": 64, "steps": 1, "num_images": 1
        }).json()
        job = _wait_job(client, ref["job_id"])
        img_id = job["images"][0]["id"]
        r = client.get(f"/api/v1/images/{img_id}/thumb")
        assert r.status_code == 200
        assert "webp" in r.headers["content-type"]

    def test_missing_prompt_rejected(self, client):
        r = client.post("/api/v1/generate", json={"prompt": "", "width": 64, "height": 64})
        assert r.status_code == 422

    def test_odd_dimension_rejected(self, client):
        r = client.post("/api/v1/generate", json={
            "prompt": "test", "width": 65, "height": 64, "steps": 1
        })
        assert r.status_code == 422


class TestEdit:
    def test_edit_instruction_succeeds(self, client):
        files = {"images": ("src.png", _png(), "image/png")}
        data = {"prompt": "make it night", "mode": "instruction", "steps": "2"}
        r = client.post("/api/v1/edit", files=files, data=data)
        assert r.status_code == 202
        job = _wait_job(client, r.json()["job_id"])
        assert job["status"] == "succeeded"
        assert len(job["images"]) == 1

    def test_edit_with_mask(self, client):
        mask_buf = io.BytesIO()
        Image.new("L", (64, 64), 255).save(mask_buf, format="PNG")
        files = {
            "images": ("src.png", _png(), "image/png"),
            "mask": ("mask.png", mask_buf.getvalue(), "image/png"),
        }
        data = {"prompt": "add fog", "mode": "inpaint", "steps": "2"}
        r = client.post("/api/v1/edit", files=files, data=data)
        assert r.status_code == 202
        job = _wait_job(client, r.json()["job_id"])
        assert job["status"] == "succeeded"

    def test_edit_invalid_upload_rejected(self, client):
        files = {"images": ("bad.png", b"not an image", "image/png")}
        data = {"prompt": "change it", "steps": "2"}
        r = client.post("/api/v1/edit", files=files, data=data)
        assert r.status_code == 422

    def test_edit_no_images_rejected(self, client):
        r = client.post("/api/v1/edit", data={"prompt": "test"})
        assert r.status_code in (400, 422)


class TestBatch:
    def test_batch_edit_returns_job_ids(self, client):
        files = [("images", ("a.png", _png(), "image/png")),
                 ("images", ("b.png", _png(), "image/png"))]
        data = {"prompt": "vintage", "steps": "2"}
        r = client.post("/api/v1/batch/edit", files=files, data=data)
        assert r.status_code == 202
        body = r.json()
        assert body["count"] == 2
        assert len(body["job_ids"]) == 2

    def test_batch_all_jobs_succeed(self, client):
        files = [("images", ("x.png", _png(), "image/png")),
                 ("images", ("y.png", _png(), "image/png"))]
        data = {"prompt": "watercolor", "steps": "2"}
        ref = client.post("/api/v1/batch/edit", files=files, data=data).json()
        # Wait for each job to finish.
        for jid in ref["job_ids"]:
            j = _wait_job(client, jid)
            assert j["status"] == "succeeded"
        # Batch status endpoint.
        ids = ",".join(ref["job_ids"])
        r = client.get(f"/api/v1/batch/status?job_ids={ids}")
        assert r.status_code == 200
        status = r.json()
        assert status["all_succeeded"] is True
        assert status["done"] == 2

    def test_batch_too_many_rejected(self, client):
        files = [("images", (f"{i}.png", _png(), "image/png")) for i in range(21)]
        r = client.post("/api/v1/batch/edit", files=files, data={"prompt": "test"})
        assert r.status_code == 422


class TestHistory:
    def test_history_returns_list(self, client):
        # Generate at least one image first.
        client.post("/api/v1/generate", json={
            "prompt": "history test", "width": 64, "height": 64, "steps": 1
        })
        r = client.get("/api/v1/history")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and "total" in body

    def test_delete_image(self, client):
        ref = client.post("/api/v1/generate", json={
            "prompt": "delete me", "width": 64, "height": 64, "steps": 1
        }).json()
        job = _wait_job(client, ref["job_id"])
        img_id = job["images"][0]["id"]
        r = client.delete(f"/api/v1/images/{img_id}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/images/{img_id}").status_code == 404
