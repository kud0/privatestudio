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
    // Une un post con su traduccion en el otro idioma. Los dos miembros del
    // par comparten el mismo valor; de ahi se derivan los hreflang.
    // Sin valor = el post no tiene traduccion y no emite hreflang.
    translationKey: z.string().optional(),
  }),
});

export const collections = { blog };
