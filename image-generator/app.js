(function () {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const form = document.getElementById("controls");
  const promptInput = document.getElementById("prompt");
  const styleInput = document.getElementById("style");
  const paletteInput = document.getElementById("palette");
  const detailInput = document.getElementById("detail");
  const randomizeBtn = document.getElementById("randomize");
  const downloadBtn = document.getElementById("download");

  const W = canvas.width;
  const H = canvas.height;

  // Hash a string into a 32-bit integer seed (FNV-1a style).
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Mulberry32: small, fast, seedable PRNG so a prompt reproduces its image.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PALETTES = {
    sunset: ["#1b1035", "#5f2c82", "#d7385e", "#ff7b54", "#ffd56b"],
    ocean: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
    forest: ["#081c15", "#1b4332", "#2d6a4f", "#52b788", "#b7e4c7"],
    neon: ["#0d0221", "#ff2079", "#7122fa", "#19f6e8", "#f9f871"],
    mono: ["#0a0a0a", "#3d3d3d", "#707070", "#a8a8a8", "#ededed"],
  };

  // Derive a palette from the prompt when "Auto" is selected.
  function autoPalette(rng) {
    const base = Math.floor(rng() * 360);
    const colors = [];
    for (let i = 0; i < 5; i++) {
      const hue = (base + i * (20 + rng() * 60)) % 360;
      const sat = 45 + rng() * 45;
      const light = 12 + i * (8 + rng() * 8);
      colors.push(`hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`);
    }
    return colors;
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function backgroundGradient(rng, palette) {
    const g = ctx.createLinearGradient(0, 0, W * (0.3 + rng()), H);
    g.addColorStop(0, palette[0]);
    g.addColorStop(0.5, palette[1]);
    g.addColorStop(1, pick(rng, palette));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const STYLES = {
    waves(rng, palette, detail) {
      backgroundGradient(rng, palette);
      const layers = detail;
      for (let l = 0; l < layers; l++) {
        const color = palette[(l % (palette.length - 1)) + 1];
        const amp = 20 + rng() * 90;
        const freq = 0.004 + rng() * 0.012;
        const phase = rng() * Math.PI * 2;
        const yBase = (H / layers) * l + rng() * 40;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 6) {
          const y = yBase + Math.sin(x * freq + phase) * amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    mosaic(rng, palette, detail) {
      const cells = detail;
      const size = W / cells;
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          ctx.fillStyle = pick(rng, palette);
          ctx.fillRect(x * size, y * size, size + 1, size + 1);
          if (rng() > 0.6) {
            ctx.fillStyle = pick(rng, palette);
            ctx.beginPath();
            ctx.arc(x * size + size / 2, y * size + size / 2, size * (0.2 + rng() * 0.25), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },

    bubbles(rng, palette, detail) {
      backgroundGradient(rng, palette);
      const count = detail * 8;
      for (let i = 0; i < count; i++) {
        const r = 6 + rng() * (W / 8);
        const x = rng() * W;
        const y = rng() * H;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.15 + rng() * 0.45;
        ctx.fillStyle = pick(rng, palette);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    rays(rng, palette, detail) {
      backgroundGradient(rng, palette);
      const cx = W * (0.3 + rng() * 0.4);
      const cy = H * (0.3 + rng() * 0.4);
      const count = detail * 3;
      const max = Math.hypot(W, H);
      for (let i = 0; i < count; i++) {
        const a1 = (i / count) * Math.PI * 2;
        const a2 = a1 + (Math.PI * 2 / count) * (0.4 + rng() * 0.6);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a1) * max, cy + Math.sin(a1) * max);
        ctx.lineTo(cx + Math.cos(a2) * max, cy + Math.sin(a2) * max);
        ctx.closePath();
        ctx.globalAlpha = 0.25 + rng() * 0.4;
        ctx.fillStyle = pick(rng, palette);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    grid(rng, palette, detail) {
      ctx.fillStyle = palette[0];
      ctx.fillRect(0, 0, W, H);
      const cells = detail;
      const size = W / cells;
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          const px = x * size;
          const py = y * size;
          ctx.fillStyle = pick(rng, palette);
          const inset = size * (rng() * 0.3);
          if (rng() > 0.5) {
            ctx.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
          } else {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + size, py);
            ctx.lineTo(px, py + size);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    },
  };

  function currentFileName() {
    const base = (promptInput.value.trim() || "image")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return `${base || "image"}-${styleInput.value}.png`;
  }

  function generate() {
    const prompt = promptInput.value.trim() || "untitled";
    const style = styleInput.value;
    const detail = parseInt(detailInput.value, 10);
    const seed = hashString(`${prompt}|${style}|${paletteInput.value}|${detail}`);
    const rng = makeRng(seed);

    const palette = paletteInput.value === "auto"
      ? autoPalette(rng)
      : PALETTES[paletteInput.value];

    ctx.clearRect(0, 0, W, H);
    (STYLES[style] || STYLES.waves)(rng, palette, detail);
  }

  function download() {
    const link = document.createElement("a");
    link.download = currentFileName();
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function randomize() {
    const words = ["aurora", "ember", "tidal", "velvet", "crystal", "drift",
      "lunar", "saffron", "cobalt", "verdant", "mirage", "echo", "nebula", "quartz"];
    const r = Math.random;
    promptInput.value = `${words[Math.floor(r() * words.length)]} ${words[Math.floor(r() * words.length)]}`;
    const styles = Object.keys(STYLES);
    styleInput.value = styles[Math.floor(r() * styles.length)];
    const palettes = ["auto", ...Object.keys(PALETTES)];
    paletteInput.value = palettes[Math.floor(r() * palettes.length)];
    detailInput.value = String(3 + Math.floor(r() * 37));
    generate();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    generate();
  });
  randomizeBtn.addEventListener("click", randomize);
  downloadBtn.addEventListener("click", download);
  detailInput.addEventListener("input", generate);
  styleInput.addEventListener("change", generate);
  paletteInput.addEventListener("change", generate);

  generate();
})();
