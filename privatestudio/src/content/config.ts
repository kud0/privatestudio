import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string().default('Renato Rojas'),
    image: z.string().optional(),
    instagram: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['es', 'en']).default('es'),
  }),
});

export const collections = { blog };
