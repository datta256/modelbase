import { MetadataRoute } from 'next';
import { db, assets } from '@/lib/db';
import { desc, sql } from 'drizzle-orm';
import { BASE_CATEGORIES } from '@/lib/categories';
import { SITE_URL } from '@/lib/site-config';

const MODEL_SITEMAP_PAGE_SIZE = 20_000;

export async function generateSitemaps() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(sql`${assets.thumbnail} IS NOT NULL AND ${assets.thumbnail} != '' AND ${assets.thumbnail} NOT LIKE '%Not found%'`);
  const pageCount = Math.max(1, Math.ceil(Number(count) / MODEL_SITEMAP_PAGE_SIZE));

  return Array.from({ length: pageCount }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
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
    .where(sql`${assets.thumbnail} IS NOT NULL AND ${assets.thumbnail} != '' AND ${assets.thumbnail} NOT LIKE '%Not found%'`)
    .orderBy(desc(sql`rowid`))
    .limit(MODEL_SITEMAP_PAGE_SIZE)
    .offset(id * MODEL_SITEMAP_PAGE_SIZE);

  const modelRoutes = models.map(m => ({
    url: `${SITE_URL}/models/${m.uid}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return id === 0
    ? [...staticRoutes, ...categoryRoutes, ...modelRoutes]
    : modelRoutes;
}
