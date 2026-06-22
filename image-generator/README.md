Image Generator
===============

A self-contained, client-side image generator. Type a prompt and it renders
unique generative art on an HTML canvas that you can download as a PNG. No
server, build step, or API key required — open it and go.

Usage
=====
Open `index.html` in any modern browser.

- **Prompt** — text that seeds the image. The same prompt, style, palette, and
  detail always produce the same image.
- **Style** — Waves, Mosaic, Bubbles, Rays, or Grid.
- **Palette** — a preset color scheme, or Auto to derive colors from the prompt.
- **Detail** — controls density/complexity.
- **Generate** — render with the current settings.
- **Randomize** — pick random settings and render.
- **Download PNG** — save the current image.

How it works
============
The prompt and settings are hashed into a numeric seed that drives a small
deterministic PRNG (Mulberry32). Each style is a drawing routine over the
HTML5 Canvas 2D API, so generation is fully reproducible and runs offline.
