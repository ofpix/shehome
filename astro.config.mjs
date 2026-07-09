import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://example.com';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    }
  },
  integrations: [sitemap({
    // Exclude optional pages from sitemap
    filter: (page) => !page.includes('/page/1/')
  })]
});
