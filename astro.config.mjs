import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import vercelJsonHeaders from './integrations/vercel-json-headers.mjs';

export default defineConfig({
  site: 'https://nhgraves.com',
  // One URL per page: /about, never /about/ (internal links, canonicals and the sitemap all match)
  trailingSlash: 'never',
  build: { format: 'file' },
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap(), vercelJsonHeaders()],
  vite: {
    plugins: [tailwindcss()],
  },
});
