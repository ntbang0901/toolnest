// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://toolnest.dev',
  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: 'auto',
  },

  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  adapter: cloudflare()
});