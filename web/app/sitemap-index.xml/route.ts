import { assets, db } from '@/lib/db';
import { SITE_URL } from '@/lib/site-config';
import { sql } from 'drizzle-orm';

const MODEL_SITEMAP_PAGE_SIZE = 20_000;

export async function GET() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(sql`${assets.thumbnail} IS NOT NULL AND ${assets.thumbnail} != '' AND ${assets.thumbnail} NOT LIKE '%Not found%'`);
  const pageCount = Math.max(1, Math.ceil(Number(count) / MODEL_SITEMAP_PAGE_SIZE));
  const lastModified = new Date().toISOString();
  const sitemaps = Array.from(
    { length: pageCount },
    (_, id) => `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${id}.xml</loc>\n    <lastmod>${lastModified}</lastmod>\n  </sitemap>`,
  ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
