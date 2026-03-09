import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.enum([
      'marketing-strategy',
      'client-case-studies',
      'sales-pricing',
      'business-scaling',
      'content-brand',
    ]),
    categoryLabel: z.string(),
    youtubeId: z.string(),
    thumbnail: z.string(),
    description: z.string(),
    duration: z.string(),
    viewCount: z.number(),
    tags: z.array(z.string()).optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { blog };
