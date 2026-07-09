#!/usr/bin/env node
/**
 * fix-image-mapping.js
 *
 * Reads the gold-standard posts.json (from the WordPress crawl) to
 * re-map every Astro entry to its CORRECT image.
 *
 * posts.json has: source_url → image.src (ig_*.jpg)
 * Each entry's `source:` field matches a source_url in posts.json.
 * We copy the correct ig_*.jpg over the current she-N.jpg.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENTRIES_DIR = path.resolve(__dirname, '..', 'src', 'content', 'entries');
const IMAGE_DIR = path.resolve(__dirname, '..', 'public', 'images', 'shehome');
const DESKTOP = '/home/horse/Desktop/shehome';
const POSTS_JSON = '/home/horse/shehome-static-kit/data/posts.json';

// ---- 1. Load posts.json mapping ----
const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf-8'));
const sourceToImage = new Map(); // source_url → ig_filename
const sourceToAuthor = new Map(); // source_url → author_slug

for (const p of posts) {
  const src = p.source_url;
  const img = p.image?.src;
  if (src && img) {
    sourceToImage.set(src, img.split('/').pop());    // "ig_VA2kwWsDxW.jpg"
    sourceToAuthor.set(src, p.author_slug || p.author);
  }
}

console.log(`posts.json loaded: ${posts.length} entries, ${sourceToImage.size} source→image mappings`);

// ---- 2. Pre-index Desktop images: ig_filename → full path ----
// Desktop has one author folder per author, each with ig_*.jpg
const desktopImages = new Map(); // ig_filename → full path
const authorDirs = fs.readdirSync(DESKTOP)
  .filter(name => fs.statSync(path.join(DESKTOP, name)).isDirectory());

for (const dir of authorDirs) {
  const dirPath = path.join(DESKTOP, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg'));
  for (const f of files) {
    if (!desktopImages.has(f)) {
      desktopImages.set(f, path.join(dirPath, f));
    }
  }
}
console.log(`Desktop indexed: ${desktopImages.size} unique images`);

// ---- 3. Iterate Astro entries and fix ----
const entryFiles = fs.readdirSync(ENTRIES_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

let fixed = 0;
let skipped = 0;
let errors = [];
let beforeSize = 0;
let afterSize = 0;

for (const entryFile of entryFiles) {
  const entryPath = path.join(ENTRIES_DIR, entryFile);
  const content = fs.readFileSync(entryPath, 'utf-8');

  // Extract source URL from frontmatter
  const sourceMatch = content.match(/^source:\s*"?([^"\n]+)"?/m);
  if (!sourceMatch) {
    skipped++;
    continue;
  }
  const sourceUrl = sourceMatch[1].trim();

  // Look up correct image
  const correctIgFile = sourceToImage.get(sourceUrl);
  if (!correctIgFile) {
    errors.push(`${entryFile}: no image mapping for ${sourceUrl}`);
    continue;
  }

  // Find the correct image on Desktop
  const correctImagePath = desktopImages.get(correctIgFile);
  if (!correctImagePath) {
    errors.push(`${entryFile}: ${correctIgFile} not found on Desktop`);
    continue;
  }

  // Destination: she-N.jpg (same filename, just overwrite with correct image)
  const slug = entryFile.replace(/\.md$/, '');
  const destPath = path.join(IMAGE_DIR, `${slug}.jpg`);

  if (!fs.existsSync(destPath)) {
    errors.push(`${entryFile}: destination ${slug}.jpg not found`);
    continue;
  }

  beforeSize += fs.statSync(destPath).size;

  // Overwrite with correct image
  fs.copyFileSync(correctImagePath, destPath);
  afterSize += fs.statSync(destPath).size;
  fixed++;
}

// ---- 4. Report ----
console.log(`\n=== Result ===`);
console.log(`Fixed: ${fixed} entries`);
console.log(`Skipped (no source field): ${skipped}`);
console.log(`Errors: ${errors.length}`);
console.log(`Before total image size: ${(beforeSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`After total image size: ${(afterSize / 1024 / 1024).toFixed(1)} MB`);

if (errors.length > 0) {
  console.log(`\nErrors (first 10):`);
  for (const e of errors.slice(0, 10)) {
    console.log(`  ${e}`);
  }
}

if (fixed > 0) {
  console.log(`\n✅ Image mapping fixed. Run 'npm run build' to rebuild.`);
}
