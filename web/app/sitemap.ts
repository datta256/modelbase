import { MetadataRoute } from 'next';
import { db, assets } from '@/lib/db';
import { sql, desc } from 'drizzle-orm';
import { ALL_CATEGORY_SLUGS } from '@/lib/categories';
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
    {
      url: `${SITE_URL}/search/`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.5,
    },
  ];

  // Use pre-computed category slugs from shared module (2,410 entries)
  const generatedCategoryRoutes = ALL_CATEGORY_SLUGS.map(cat => ({
    url: `${SITE_URL}/category/${cat}/`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
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

  // Get recent models (limit to 1000 most recent)
  const recentModels = await db
    .select({
      uid: assets.uid,
    })
    .from(assets)
    .where(sql`${assets.thumbnail} != ''`)
    .orderBy(desc(sql`rowid`))
    .limit(1000);

  const modelRoutes = recentModels.map(m => ({
    url: `${SITE_URL}/models/${m.uid}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...generatedCategoryRoutes, ...authorRoutes, ...modelRoutes];
}
