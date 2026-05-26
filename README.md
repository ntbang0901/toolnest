# Toolnest

All-in-one developer toolbox. Free, no account, no tracking, runs entirely in your browser.

## Why Toolnest

- **Free forever** — no premium tier, no ads
- **No account** — open and use, that's it
- **Privacy-first** — every tool runs client-side, your data never leaves the browser
- **Offline-ready** — works without internet once loaded
- **Fast** — built on Astro with islands architecture, ships minimal JavaScript

## Tech stack

- Astro 5 (static output)
- React (islands for interactive tools)
- Tailwind CSS v4
- shadcn/ui components
- TypeScript strict mode
- Cloudflare Pages hosting

## Local development

```bash
pnpm install
pnpm dev
```

Open http://localhost:4321

## Project structure

```
src/
├── components/
│   ├── layout/      # Header, Sidebar, Footer
│   ├── tools/       # Per-tool React islands
│   └── ui/          # shadcn primitives
├── lib/
│   ├── tools-registry.ts  # Tool metadata (single source of truth)
│   └── utils.ts
├── pages/
│   ├── index.astro
│   └── tools/[slug].astro
└── styles/
    └── globals.css
```

## Adding a new tool

1. Add metadata to `src/lib/tools-registry.ts`
2. Create the page at `src/pages/tools/<slug>.astro`
3. Build the React island at `src/components/tools/<Slug>Tool.tsx`

The sitemap, search palette, and category pages pick it up automatically.

## License

MIT
