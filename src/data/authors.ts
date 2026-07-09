import { getCollection } from 'astro:content';

let _cachedAuthors: [string, number][] | null = null;

export async function getAllAuthors(): Promise<[string, number][]> {
  if (_cachedAuthors) return _cachedAuthors;

  const entries = await getCollection('entries', ({ data }) => !data.draft);
  const authorCounts = new Map<string, number>();
  for (const entry of entries) {
    const author = entry.data.author || 'Unknown';
    authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
  }
  const result = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
  _cachedAuthors = result;
  return result;
}
