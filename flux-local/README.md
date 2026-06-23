# flux-local

Local-first image **generation** & **editing** studio. FastAPI backend + a
model-resident inference worker behind a swappable `InferenceBackend`, with a
Vite + React + TypeScript UI (live progress over WebSocket, gallery, mask-based
editing). Telegram is intentionally out of scope for this build.

> **Runs anywhere out of the box.** The default `mock` backend produces
> deterministic placeholder images using only Pillow, so the entire stack —
> queue, API, WebSocket progress, storage, UI — works on CI and non-Mac
> machines. On Apple Silicon, flip one env var to use the real MLX/`mflux`
> model.

## What's implemented

| Area | Status |
|---|---|
| Text → image (`POST /api/v1/generate`) | ✅ prompt, negative, W/H, steps, guidance, seed, batch |
| Image → image (`POST /api/v1/edit`) | ✅ instruction · style · background · inpaint (mask), multi-reference, face-safe flag |
| Live progress | ✅ WebSocket `/api/v1/jobs/{id}/progress` (step ticks + terminal events) |
| Storage | ✅ SQLite (SQLAlchemy 2 async) + filesystem images + WebP thumbnails |
| Queue / worker | ✅ model loaded once, GPU concurrency = 1, sync inference off the event loop |
| Backends | ✅ `MockBackend` (anywhere) · `MfluxBackend` (Apple Silicon, import-guarded) |
| Frontend | ✅ Generate / Edit / History tabs, mask canvas (Konva), lightbox, offline cache (Dexie) |
| Security | ✅ localhost bind, CORS lock, upload sniff+verify+re-encode, EXIF strip |

## Architecture (request → image)

```
React UI ──REST──▶ FastAPI ──enqueue──▶ asyncio queue ──▶ Worker (model resident)
   ▲                  │                                        │
   └────WebSocket◀────┴──────── EventBus ◀── progress ─────────┘
                       SQLite (jobs/images)   Filesystem (png + webp thumb)
```

The backend never imports MLX. Everything model-specific lives behind
`app/inference/interface.py`; swapping `mock` → `mflux` → a future CUDA/remote
backend is a config change (`INFERENCE_BACKEND`).

## Quick start

```bash
# 1) Backend deps
cd apps/backend
python -m venv .venv && source .venv/bin/activate
pip install -e .            # add '.[mac]' on Apple Silicon for real inference

# 2) Frontend deps
cd ../frontend && npm install

# 3) Run both (from repo root)
cp .env.example .env
bash scripts/dev.sh         # backend :8000, UI :5173
```

Open http://127.0.0.1:5173.

### Use the real model (Apple Silicon)

```bash
huggingface-cli login                  # accept the gated license in a browser
bash scripts/download-model.sh         # optional pre-cache
# in .env:
INFERENCE_BACKEND=mflux
MODEL_ID=black-forest-labs/FLUX.2-klein-9B
QUANTIZATION=4
```

> **License note:** FLUX.2-klein weights are under the FLUX **Non-Commercial**
> License (gated, non-OSI). For a fully open-source / commercial-safe setup,
> point `MODEL_ID` at an Apache-2.0 model (Z-Image, FLUX.1-schnell, Qwen-Image)
> — the backend abstraction makes this a config change. The model's safety
> filters are kept intact; do not strip them.

## Verify it works (no GPU needed)

```bash
cd apps/backend && PYTHONPATH=. python ../../scripts/smoke_test.py
cd apps/frontend && npm run build
```

## API

```
GET  /api/v1/health
GET  /api/v1/models
POST /api/v1/generate                 -> { job_id }
POST /api/v1/edit                      (multipart: images[], mask?) -> { job_id }
GET  /api/v1/jobs/{id}
WS   /api/v1/jobs/{id}/progress
GET  /api/v1/history?limit&offset
GET  /api/v1/prompts
GET  /api/v1/images/{id}  ·  /thumb
DELETE /api/v1/images/{id}
```

Interactive docs at http://127.0.0.1:8000/docs.

## Layout

```
apps/backend/app/
  core/        config (pydantic-settings), logging
  db/          SQLAlchemy models + async session
  storage/     image/thumbnail store, secure upload validation
  inference/   interface.py (ABC), types.py, backends/{mock,mflux}, registry
  queue/       worker.py (model-resident), events.py (progress pub/sub)
  api/         routes/, schemas, ws, deps
apps/frontend/src/
  api/  hooks/  stores/  components/  features/{generate,edit,history}  lib/
scripts/       dev.sh, smoke_test.py, download-model.sh
```
