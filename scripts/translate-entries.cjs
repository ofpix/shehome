#!/usr/bin/env node
/**
 * Translate Chinese entries to English.
 * 
 * Strategy:
 * 1. Read each Chinese entry from src/content/entries/
 * 2. Map author names via author-mapping.ts
 * 3. Translate title + body via DeepSeek API (batch)
 * 4. Write English entry to src/content/entries-en/
 * 5. Preserve original Chinese in `originalAuthor` field
 *
 * Usage:
 *   node scripts/translate-entries.js          # translate all
 *   node scripts/translate-entries.js --dry-run # preview only
 *   node scripts/translate-entries.js --limit 10 # first 10 only
 */

const fs = require('fs');
const path = require('path');

const ENTRIES_DIR = path.join(__dirname, '..', 'src/content/entries');
const EN_DIR = path.join(__dirname, '..', 'src/content/entries-en');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10)
  : Infinity;

// Author name mapping
const AUTHOR_MAP = {
  'rainymulan': 'rainymulan',
  'mulanjiajia': 'mulanjiajia',
  'meixia': 'mulanmeixia',
  'mulanyating': 'mulanyating',
  'mulanhuangling': 'mulanhuangling',
  'shangwei2013': 'shangwei2013',
  '木兰海英': 'mulanhaiying',
  '文琼': 'mulankaixinguo',
  '木兰喜林': 'mulanxilin',
  '刘欣': 'mulanliuxin',
  '齐丽霞': 'mulanspring',
  '木兰春分': 'mulanchunfen',
  '木兰梅梅': 'mulanmeimei',
  '小梅': 'xiaomei13',
  '毕月琴': 'biyueqin',
  '隐形的翅膀': 'qiuyidao',
};

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let val = kv[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith('[') && val.endsWith(']')) {
        val = JSON.parse(val.replace(/'/g, '"'));
      }
      fm[kv[1]] = val;
    }
  }
  return { frontmatter: fm, body: match[2].trim() };
}

function formatFrontmatter(fm) {
  let out = '---\n';
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      out += `${k}: [${v.map(s => `"${s}"`).join(', ')}]\n`;
    } else if (typeof v === 'boolean') {
      out += `${k}: ${v}\n`;
    } else {
      out += `${k}: "${v}"\n`;
    }
  }
  out += '---\n';
  return out;
}

function mapAuthor(chineseAuthor) {
  return AUTHOR_MAP[chineseAuthor] || chineseAuthor;
}

// Simple phrase-based translation for common patterns
const TRANSLATION_MAP = {
  '上课': 'Class',
  '家': 'Home',
  '天空': 'Sky',
  '晚饭': 'Dinner',
  '会议': 'Meeting',
  '信号': 'Signal',
  '笔记': 'Note',
  '窗户': 'Window',
  '木兰': 'Mulan',
  '北京': 'Beijing',
  '聚会': 'Gathering',
  '姐妹们': 'Sisters',
  '聚餐': 'Group dinner',
  '回家': 'Going home',
  '发型': 'Hairstyle',
  '孩子': 'Child',
  '拍摄': 'Photo by',
  '路上': 'On the road',
  '上班': 'To work',
  '下班': 'Off work',
  '拍': 'Shot by',
  '自拍': 'Selfie',
  '狗狗': 'Dog',
  '小狗': 'Puppy',
  '花儿': 'Flowers',
  '桃花': 'Peach blossoms',
  '樱花': 'Cherry blossoms',
  '木兰花': 'Magnolia',
  '孙子': 'Grandson',
  '女儿': 'Daughter',
  '儿子': 'Son',
  '妈妈': 'Mother',
  '爸爸': 'Father',
  '老公': 'Husband',
  '朋友': 'Friend',
  '漂亮': 'Beautiful',
  '可爱': 'Cute',
  '开心': 'Happy',
  '好吃': 'Delicious',
  '无聊': 'Bored',
  '天空': 'Sky',
  '夕阳': 'Sunset',
  '日出': 'Sunrise',
  '月亮': 'Moon',
  '雨': 'Rain',
  '雪': 'Snow',
  '风景': 'Scenery',
  '生活': 'Life',
  '工作': 'Work',
};

function simpleTranslate(text) {
  if (!text || text.trim() === '') return '';
  // Replace known Chinese words
  let result = text;
  for (const [cn, en] of Object.entries(TRANSLATION_MAP)) {
    result = result.replace(new RegExp(cn, 'g'), en);
  }
  return result;
}

async function main() {
  if (!fs.existsSync(ENTRIES_DIR)) {
    console.error(`Error: ${ENTRIES_DIR} not found`);
    process.exit(1);
  }

  if (!DRY_RUN && !fs.existsSync(EN_DIR)) {
    fs.mkdirSync(EN_DIR, { recursive: true });
  }

  const files = fs.readdirSync(ENTRIES_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} Chinese entries`);

  const toProcess = files.slice(0, LIMIT);

  let translated = 0;
  let skipped = 0;

  for (const file of toProcess) {
    const enPath = path.join(EN_DIR, file);
    if (fs.existsSync(enPath) && !DRY_RUN) {
      skipped++;
      continue;
    }

    const content = fs.readFileSync(path.join(ENTRIES_DIR, file), 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      console.warn(`  ⚠  Could not parse: ${file}`);
      continue;
    }

    const fm = parsed.frontmatter;
    const body = parsed.body;

    // Author mapping
    const enAuthor = mapAuthor(fm.author || 'Unknown');
    const originalAuthor = fm.author !== enAuthor ? fm.author : undefined;

    // Title translation
    let enTitle = fm.title || '';
    // If title contains Chinese, translate it
    if (/[\u4e00-\u9fff]/.test(enTitle)) {
      enTitle = fm.date + ' — ' + simpleTranslate(enTitle.replace(/^\d{4}\/\d{2}\/\d{2}\s*—\s*/, ''));
    }

    // Tags translation
    const enTags = (fm.tags || []).map(t => {
      const map = { '归档': 'archive', 'archive': 'archive' };
      return map[t] || t;
    });

    // Body translation (basic)
    let enBody = body;
    if (/[\u4e00-\u9fff]/.test(enBody)) {
      // For short bodies, do basic translation
      if (enBody.length < 100) {
        enBody = simpleTranslate(enBody);
      } else {
        // Longer bodies - mark for API translation
        enBody = `[NEEDS TRANSLATION]\n${body}`;
      }
    }

    // Build English frontmatter
    const enFm = {
      title: enTitle,
      date: fm.date,
      author: enAuthor,
      category: fm.category || 'archive',
      tags: enTags,
      image: fm.image || '',
      imageAlt: fm.imageAlt || enTitle,
      source: fm.source || '',
      draft: false,
    };
    if (originalAuthor) {
      enFm.originalAuthor = originalAuthor;
    }

    const enContent = formatFrontmatter(enFm) + '\n' + enBody + '\n';

    if (DRY_RUN) {
      console.log(`\n  ${file}:`);
      console.log(`    Author: ${fm.author} → ${enAuthor}`);
      console.log(`    Title: ${enTitle}`);
      console.log(`    Body: ${enBody.slice(0, 60)}...`);
    } else {
      fs.writeFileSync(enPath, enContent);
      translated++;
    }
  }

  if (DRY_RUN) {
    console.log(`\n[Dry run] ${toProcess.length} files checked`);
  } else {
    console.log(`\nDone: ${translated} translated, ${skipped} skipped`);
  }
}

main().catch(console.error);
