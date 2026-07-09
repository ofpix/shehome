// Build-time base path — works with Astro's base config
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function withBase(path: string): string {
  return base + path;
}

export const site = {
  name: 'SheHome',
  shortName: 'SheHome',
  subtitle: 'Mobile photography & short-form archive',
  description: 'A photo and short text archive exported from multiple Instagram accounts. 16 authors, 4000+ entries, presented in a three-column stream.',
  basePath: base,
  lang: 'en',
  nav: [
    { href: withBase('/'), label: 'Home' },
    { href: withBase('/about/'), label: 'About' },
    { href: withBase('/authors/'), label: 'Authors' },
    { href: withBase('/entries/'), label: 'All Entries' },
  ],
  footer: '© SheHome by OFPiX'
};

export { withBase };
