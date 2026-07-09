# OFPiX Classic Astro

A static Astro starter for a content-heavy archive site.

Design brief:

- White fixed sidebar on desktop.
- Mobile top header with a sliding left drawer.
- Three-column content stream inspired by short-form photo/text archive sites.
- Each entry shows title, date, author, optional image, tags, and full short body text.
- Static output only, suitable for GitHub Pages.

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

This project includes `.github/workflows/deploy.yml`.

For a project site like `https://username.github.io/repo-name/`, set repository variables:

- `SITE_URL=https://username.github.io`
- `BASE_PATH=/repo-name/`

For a custom domain or user site, set:

- `SITE_URL=https://your-domain.example`
- `BASE_PATH=/`

## Content

Add Markdown files in:

```text
src/content/entries/
```

Example:

```md
---
title: "2013/01/28 — 上课"
date: "2013-01-28"
author: "Archive"
category: "archive"
tags: ["note", "photo"]
image: "/images/example.jpg"
imageAlt: "Example image"
---

Short body text goes here. The homepage renders the full body.
```

## Where to customize

- Site name and navigation: `src/data/site.ts`
- Layout shell: `src/layouts/BaseLayout.astro`
- Sidebar: `src/components/Sidebar.astro`
- Entry cards: `src/components/EntryCard.astro`
- Styles: `src/styles/global.css`
