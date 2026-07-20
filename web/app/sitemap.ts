import { MetadataRoute } from 'next';
import { db, assets } from '@/lib/db';
import { desc, sql } from 'drizzle-orm';
import { BASE_CATEGORIES } from '@/lib/categories';
import { SITE_URL } from '@/lib/site-config';

const CURATED_MODEL_LIMIT = 2_000;

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

  const models = await db
    .select({
      uid: assets.uid,
    })
    .from(assets)
    .where(sql`${assets.downloadable} = 1 AND ${assets.thumbnail} IS NOT NULL AND ${assets.thumbnail} != '' AND ${assets.thumbnail} NOT LIKE '%Not found%'`)
    .orderBy(desc(assets.face_count), desc(sql`rowid`))
    .limit(CURATED_MODEL_LIMIT);

  const modelRoutes = models.map(m => ({
    url: `${SITE_URL}/models/${m.uid}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...modelRoutes];
}
