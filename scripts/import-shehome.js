#!/usr/bin/env node
/**
 * SheHome Data Import Script v3 — Image pairing
 *
 * Matching strategy for .txt → .jpg:
 * 1. Direct: txt named "ig_abc.txt" → "ig_abc.jpg"
 * 2. Shortcode embed: txt filename "instagram-abc.txt" → "ig_abc.jpg"
 * 3. Sort-order pairing for remaining unmatched files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = '/home/horse/Desktop/shehome';
const CONTENT_DIR = path.resolve(__dirname, '..', 'src', 'content', 'entries');
const IMAGE_DIR = path.resolve(__dirname, '..', 'public', 'images', 'shehome');

fs.mkdirSync(CONTENT_DIR, { recursive: true });
fs.mkdirSync(IMAGE_DIR, { recursive: true });

// Extract Instagram shortcode from filename
function extractShortcode(filename) {
  const stem = filename.replace(/\.txt$/i, '');
  // Case 1: ig_SHORTCODE.txt
  if (stem.startsWith('ig_')) return stem.substring(3);
  // Case 2: instagram-SHORTCODE.txt
  if (stem.startsWith('instagram-')) return stem.substring(10);
  // Case 3: 2013-01-28-4.txt — no shortcode
  return null;
}

const authorDirs = fs.readdirSync(SOURCE)
  .filter(name => fs.statSync(path.join(SOURCE, name)).isDirectory())
  .sort();

console.log(`Found ${authorDirs.length} author directories\n`);

let totalEntries = 0;
let totalImages = 0;

for (const authorDir of authorDirs) {
  const authPath = path.join(SOURCE, authorDir);

  const txtFiles = fs.readdirSync(authPath)
    .filter(f => f.endsWith('.txt'))
    .sort();
  const jpgFiles = fs.readdirSync(authPath)
    .filter(f => f.endsWith('.jpg'));

  // Build a lookup map: shortcode → jpg filename (case-insensitive)
  const jpgByShortcode = new Map();
  for (const jpg of jpgFiles) {
    const stem = jpg.replace(/\.jpg$/i, '');
    if (stem.startsWith('ig_')) {
      jpgByShortcode.set(stem.substring(3).toLowerCase(), jpg);
    } else {
      jpgByShortcode.set(stem.toLowerCase(), jpg);
    }
  }

  let authorEntries = 0;
  let authorImages = 0;
  let usedJpgs = new Set();
  const sortedJpgs = [...jpgFiles].sort();
  let jpgIdx = 0;

  for (const txtFile of txtFiles) {
    const txtPath = path.join(authPath, txtFile);
    const content = fs.readFileSync(txtPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length === 0) continue;

    const dateLine = lines.find(l => l.startsWith('日期：'));
    const authorLine = lines.find(l => l.startsWith('作者：'));
    const descLine = lines.find(l => l.startsWith('说明：'));
    const sourceLine = lines.find(l => l.startsWith('原始链接：'));

    const rawDate = dateLine ? dateLine.replace('日期：', '').trim() : '';
    const entryAuthor = authorLine ? authorLine.replace('作者：', '').trim() : authorDir;
    const description = descLine ? descLine.replace('说明：', '').trim() : '';
    const source = sourceLine ? sourceLine.replace('原始链接：', '').trim() : '';

    const dateParts = rawDate.split('/');
    const entryDate = (dateParts.length === 3 && dateParts[0].length === 4)
      ? `${dateParts[0]}-${dateParts[1].padStart(2,'0')}-${dateParts[2].padStart(2,'0')}`
      : '2013-01-01';

    const dateStr = rawDate.replace(/\//g, '/');
    const title = description
      ? `${dateStr} — ${description.length > 60 ? description.slice(0, 60) + '…' : description}`
      : `${dateStr}`;

    const body = lines.filter(l =>
      !l.startsWith('日期：') && !l.startsWith('作者：') &&
      !l.startsWith('说明：') && !l.startsWith('原始链接：')
    ).join('\n').trim();

    // Find matching image: try shortcode first, then sort-order fallback
    let matchedJpg = null;
    const sc = extractShortcode(txtFile);
    if (sc) {
      const exactMatch = jpgByShortcode.get(sc.toLowerCase());
      if (exactMatch && !usedJpgs.has(exactMatch)) {
        matchedJpg = exactMatch;
        usedJpgs.add(exactMatch);
      } else if (exactMatch) {
        // Shortcode already matched by another txt (rare duplicate)
      }
    }

    if (!matchedJpg) {
      // Sort-order fallback: skip already-used jpgs
      while (jpgIdx < sortedJpgs.length && usedJpgs.has(sortedJpgs[jpgIdx])) {
        jpgIdx++;
      }
      if (jpgIdx < sortedJpgs.length) {
        matchedJpg = sortedJpgs[jpgIdx];
        usedJpgs.add(matchedJpg);
        jpgIdx++;
      }
    }

    const slug = `she-${totalEntries + authorEntries + 1}`;

    let md = '---\n';
    md += `title: "${title.replace(/"/g, '\\"')}"\n`;
    md += `date: "${entryDate}"\n`;
    md += `author: "${entryAuthor}"\n`;
    md += `category: "archive"\n`;
    md += `tags: ["archive"]\n`;
    if (source) md += `source: "${source.replace(/"/g, '\\"')}"\n`;
    if (matchedJpg) {
      const imgDestName = `${slug}.jpg`;
      const imgSrc = path.join(authPath, matchedJpg);
      const imgDst = path.join(IMAGE_DIR, imgDestName);
      if (!fs.existsSync(imgDst)) {
        try { fs.copyFileSync(imgSrc, imgDst); authorImages++; } catch {}
      }
      md += `image: "/images/shehome/${imgDestName}"\n`;
      md += `imageAlt: "${title.replace(/"/g, '\\"')}"\n`;
    }
    md += 'draft: false\n---\n\n';
    md += body || '\n';

    fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), md, 'utf-8');
    authorEntries++;
  }

  console.log(`${authorDir}: ${authorEntries} entries, ${authorImages}/${jpgFiles.length} images`);
  totalEntries += authorEntries;
  totalImages += authorImages;
}

console.log(`\n=== Complete ===`);
console.log(`Total entries: ${totalEntries}`);
console.log(`Total images: ${totalImages}`);
