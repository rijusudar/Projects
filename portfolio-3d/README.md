# Riju Sudar — 3D Animated Portfolio

A single-file, zero-dependency portfolio: white "spatial gallery" theme with
floating 3D objects, mouse + scroll parallax, 3D tilt cards, and a guided
walkthrough that tours visitors through the profile section by section.

## Highlights

- **White gallery theme** — porcelain ground, ultramarine `#3D46F2` accent,
  signal-coral highlights, pastel floating objects.
- **Floating 3D scene** — CSS-3D wireframe cube, torus ring, coral sphere and
  tech chips drifting on mouse parallax at different depths.
- **Parallax** — scroll-linked background word, depth-layered floats, scroll
  progress bar.
- **3D tilt cards** — experience and project cards tilt in perspective with a
  cursor-tracked glare.
- **Guided walkthrough** — "Walk me through" tours the visitor through 7 steps
  (hero → about → numbers → experience → work → skills → contact) with a
  spotlight effect, keyboard navigation (←/→/Esc) and an auto-invite toast.
- **Self-contained** — fonts (Sora, Instrument Sans, Spline Sans Mono) are
  inlined as data URIs. No CDN, no build step, no framework.
- **Accessible** — WCAG-minded focus states, `prefers-reduced-motion`
  support, semantic landmarks.

## Run it

Open `index.html` in a browser — that's it. Or host it anywhere
(GitHub Pages, Netlify, S3): it's one file.

## Content source

All content comes verbatim from the resume data in
[`portfolio/src/lib/data.ts`](../portfolio/src/lib/data.ts).
