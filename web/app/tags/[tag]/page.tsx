import { notFound } from 'next/navigation';
import { db, assets } from '@/lib/db';
import { sql, and, isNotNull, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import AssetCard from '@/components/AssetCard';
import { SITE_URL } from '@/lib/site-config';

interface PageProps {
  params: Promise<{
    tag: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

const PAGE_SIZE = 12;

// Generate static params for popular tags (limit to top 100 for build performance)
export async function generateStaticParams() {
  const results = await db
    .select({ tags: assets.tags })
    .from(assets)
    .where(sql`${assets.tags} IS NOT NULL AND ${assets.tags} != ''`);

  const tagCounts: Record<string, number> = {};
  for (const row of results) {
    if (row.tags) {
      const tagList = row.tags.split(',').map(t => t.trim().toLowerCase());
      for (const tag of tagList) {
        if (tag) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([tag]) => ({ tag: tag.replace(/\s+/g, '-') }));

  return topTags;
}

async function getTagStats(tag: string) {
  const tagName = formatTagName(tag);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(
      and(
        sql`(${assets.tags}) LIKE ${'%' + tagName + '%'}`,
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    );
  return result[0]?.count || 0;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const { page = '1' } = await searchParams;
  const tagName = formatTagName(tag);
  const currentPage = parseInt(page, 10);

  const totalCount = await getTagStats(tag);

  const title = currentPage > 1
    ? `${tagName} 3D Models - Page ${currentPage} | ModelBase`
    : `${tagName} 3D Models | Free Download | ModelBase`;

  const hasMore = totalCount > currentPage * PAGE_SIZE;

  return {
    title,
    description: `Browse ${currentPage > 1 ? `page ${currentPage} of ` : ''}${totalCount.toLocaleString()} 3D models tagged with "${tagName}". Download free ${tagName.toLowerCase()} 3D assets from the Objaverse dataset.`,
    keywords: [`${tagName} 3D models`, `${tagName} assets`, 'free 3D models', 'download', 'Sketchfab', 'OBJ', 'GLTF'],
    robots: {
      index: currentPage === 1,
      follow: true,
    },
    alternates: {
      canonical: currentPage > 1 ? `/tags/${tag}/?page=${currentPage}` : `/tags/${tag}/`,
    },
    openGraph: {
      title: `${tagName} 3D Models | Tagged Assets`,
      description: `Browse ${totalCount.toLocaleString()} 3D models tagged with "${tagName}" on ModelBase.`,
      type: 'website',
    },
    other: {
      ...(currentPage > 1 && { 'prev': `/tags/${tag}/?page=${currentPage - 1}` }),
      ...(hasMore && { 'next': `/tags/${tag}/?page=${currentPage + 1}` }),
    },
  };
}

function formatTagName(slug: string): string {
  return slug.replace(/-/g, ' ');
}

async function getTagAssets(tag: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const tagName = formatTagName(tag);

  const results = await db
    .select({
      uid: assets.uid,
      name: assets.name,
      thumbnail: assets.thumbnail,
      author: assets.author,
      face_count: assets.face_count,
      downloadable: assets.downloadable,
    })
    .from(assets)
    .where(
      and(
        sql`(${assets.tags}) LIKE ${'%' + tagName + '%'}`,
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = results.length > PAGE_SIZE;
  const items = hasMore ? results.slice(0, PAGE_SIZE) : results;

  return { items, hasMore, currentPage: page, tagExists: items.length > 0 || page > 1 };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { tag } = await params;
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);
  const tagName = formatTagName(tag);

  const { items, hasMore, tagExists: exists } = await getTagAssets(tag, currentPage);
  const totalCount = await getTagStats(tag);

  // Only return 404 if the tag doesn't exist at all
  if (items.length === 0 && currentPage === 1 && !exists) {
    notFound();
  }

  // Generate structured data
  const itemListStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${tagName} 3D Models`,
    itemListElement: items.map((asset, index) => ({
      '@type': 'ListItem',
      position: (currentPage - 1) * PAGE_SIZE + index + 1,
      item: {
        '@type': '3DModel',
        name: asset.name,
        url: `${SITE_URL}/models/${asset.uid}/`,
        image: asset.thumbnail,
        creator: asset.author ? {
          '@type': 'Person',
          name: asset.author,
        } : undefined,
      },
    })),
  };

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tags',
        item: `${SITE_URL}/tags/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tagName,
        item: `${SITE_URL}/tags/${tag}/`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm text-zinc-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-100">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/tags/" className="hover:text-zinc-100">Tags</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-100">{tagName}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">{tagName} 3D Models</h1>
        <p className="text-zinc-400 mb-8">
          {totalCount.toLocaleString()} 3D models tagged with "{tagName}" - free download
        </p>

        {/* Asset Grid */}
        {items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {items.map((asset) => (
                <AssetCard
                  key={asset.uid}
                  uid={asset.uid}
                  name={asset.name}
                  thumbnail={asset.thumbnail}
                  author={asset.author}
                  faceCount={asset.face_count}
                  downloadable={asset.downloadable}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4">
              {currentPage > 1 && (
                <Link
                  href={`/tags/${tag}/?page=${currentPage - 1}`}
                  className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  ← Previous
                </Link>
              )}
              <span className="px-4 py-2 bg-zinc-900 rounded-lg text-zinc-400">
                Page {currentPage}
              </span>
              {hasMore && (
                <Link
                  href={`/tags/${tag}/?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </>
        ) : (
          <p className="text-zinc-400">No assets found with this tag.</p>
        )}
      </div>
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const revalidate = 86400; // 24 hours ISR
