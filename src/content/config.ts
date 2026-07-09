import { defineCollection, z } from 'astro:content';

const entries = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().default('Archive'),
    category: z.string().default('archive'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    source: z.string().optional(),
    originalAuthor: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { entries };
