import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://ofpix.github.io/shehome';
const base = process.env.BASE_PATH || '/shehome';

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
    filter: (page) => !page.includes('/page/1/')
  })]
});
