"""Shared pytest fixtures.

Sets up an isolated in-process app instance with:
- MockBackend (no GPU required)
- Temporary data dir (cleaned up after each test session)
- SQLite initialized fresh per test (via function-scoped override)
"""
from __future__ import annotations

import os
import tempfile

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.db.models import Base
from app.db.session import get_session
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _env(tmp_path_factory):
    data = tmp_path_factory.mktemp("data")
    os.environ["INFERENCE_BACKEND"] = "mock"
    os.environ["DATA_DIR"] = str(data)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=True) as c:
        # Poll until backend is ready (model load is async).
        for _ in range(100):
            import time; time.sleep(0.05)
            if c.get("/api/v1/health").json().get("backend_ready"):
                break
        yield c


@pytest_asyncio.fixture()
async def aclient():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
