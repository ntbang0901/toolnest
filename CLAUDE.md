# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server at http://localhost:4321
pnpm build        # build static output to ./dist
pnpm typecheck    # run astro check (TypeScript)
```

There is no test runner configured. Type checking is the primary verification step.

## Architecture

Toolnest is an Astro 5 site with React islands, deployed to Cloudflare Pages. The output is fully static except for the Paste & Share API.

**Routing:** Every tool lives at `/tools/[slug]`. Each page is a thin `.astro` file that wraps a single React island with `<ToolLayout slug="...">`. The slug is the single identifier connecting the registry, the page, and the component.

**Tools registry** (`src/lib/tools-registry.ts`) is the single source of truth for all tool metadata (slug, name, description, category, icon, keywords, featured). The sidebar, command palette, search, sitemap, and related-tools section all derive from this file automatically — adding a tool here is the only registration step needed.

**Adding a tool** (three files, always the same pattern):
1. Add an entry to `tools` array in `src/lib/tools-registry.ts`
2. Create `src/pages/tools/<slug>.astro` — wraps the component in `<ToolLayout>`
3. Create `src/components/tools/<slug>-tool.tsx` — the React island with `client:load`

**Cloudflare Worker** (`src/worker.ts`) runs alongside the static assets and handles the `/api/paste/*` routes for Paste & Share. It uses Cloudflare KV (binding: `PASTES`) for storage. All other requests fall through to `env.ASSETS.fetch(request)`. The worker is the only server-side code; everything else is client-side.

**Styling:** Tailwind CSS v4 via the Vite plugin (not PostCSS). Global tokens and theme are in `src/styles/globals.css`. UI primitives are shadcn/ui components in `src/components/ui/`.

**Layout:** `src/layouts/base-layout.astro` → `src/layouts/tool-layout.astro`. The tool layout injects a `<RecentTracker>` island (tracks recently visited tools in localStorage) and auto-renders related tools from the same category below each tool.

## Deployment

The site deploys to Cloudflare Pages with `wrangler`. The KV namespace binding (`PASTES`) must exist before deploying — the `wrangler.toml` holds the namespace IDs.
