# Riju Sudar — Portfolio

A modern, animated, interactive personal portfolio built from the resume of
**Riju Sudar** — UI / React / Angular / Ember / Node Architect.

## Tech Stack

- **Next.js 15** (App Router, fully static output)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (scroll reveals, timeline, typewriter, filter transitions)
- **Lucide React** icons (+ inline GitHub brand mark)
- **shadcn/ui-style** primitives (`Button`, `Card`, `Badge` — vendored, cva + tailwind-merge)

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (static)
npm start        # serve the production build
```

## Structure

| Path | Purpose |
| --- | --- |
| `src/lib/data.ts` | **Single source of truth** — all resume content lives here |
| `src/components/sections/` | One component per page section |
| `src/components/ui/` | shadcn-style primitives |
| `src/components/motion.tsx` | Reusable Framer Motion reveal/stagger helpers |
| `src/app/resume/` | Printable, ATS-friendly resume (`Save as PDF` uses the browser print dialog) |

## Sections

Hero (typewriter roles) · About · Skills (marquee + 8 categorized groups) ·
Experience (14-year alternating timeline) · Projects (13 projects, domain
filter) · Achievements (animated counters) · Education & Certifications ·
GitHub Stats · Testimonials · Blog · Contact (mailto form) · Footer.

## ⚠️ Placeholders to replace

Everything on the site comes from the resume **except** the following, which
are clearly marked in the UI and in `src/lib/data.ts` with `placeholder: true`:

1. **Testimonials** — swap in real quotes (LinkedIn recommendations work well).
2. **Blog posts** — replace suggested topics with real article links.
3. **GitHub statistics** — wire up the GitHub API or
   [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
   for `@rijusudar`; values currently render as `——`.
4. **Stack Overflow URL** — the resume lists the handle "riju"; update
   `profile.stackoverflow` in `data.ts` with the full profile URL (user id).
5. **Resume PDF** — the `/resume` page prints to PDF; optionally drop a real
   PDF into `public/` and point the download buttons at it.
