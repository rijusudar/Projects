#!/usr/bin/env bash
# Pre-download / cache the model weights for the mflux (Apple Silicon) path.
# Requires `huggingface-cli login` AND accepting the gated license in a browser
# at the model page first. See the FLUX Non-Commercial License note in the plan.
set -euo pipefail

MODEL="${MODEL_ID:-black-forest-labs/FLUX.2-klein-9B}"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "huggingface-cli not found. Install: uv pip install huggingface_hub" >&2
  exit 1
fi

echo "Downloading $MODEL (gated — accept the license on its HF page first)…"
huggingface-cli download "$MODEL"
echo "Done. Weights cached under \$HF_HOME (default ~/.cache/huggingface)."
