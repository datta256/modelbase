import { MetadataRoute } from 'next';
import { db, assets } from '@/lib/db';
import { sql, desc } from 'drizzle-orm';
import { BASE_CATEGORIES } from '@/lib/categories';
import { SITE_URL } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/downloadable/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/category/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/authors/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/tags/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];

  // Only expose canonical base category URLs; modifier combinations duplicate these results.
  const categoryRoutes = BASE_CATEGORIES.map(category => ({
    url: `${SITE_URL}/category/${category}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Get all authors
  const authors = await db
    .select({ author: assets.author })
    .from(assets)
    .where(sql`${assets.author} IS NOT NULL`)
    .groupBy(assets.author);

  const authorRoutes = authors
    .filter(a => a.author)
    .map(a => ({
      url: `${SITE_URL}/authors/${encodeURIComponent(a.author!.replace(/\s+/g, '-'))}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  // Include every model with a usable thumbnail. The current catalogue remains below the 50,000 URL sitemap limit.
  const models = await db
    .select({
      uid: assets.uid,
    })
    .from(assets)
    .where(sql`${assets.thumbnail} != ''`)
    .orderBy(desc(sql`rowid`));

  const modelRoutes = models.map(m => ({
    url: `${SITE_URL}/models/${m.uid}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...authorRoutes, ...modelRoutes];
}
