import { notFound } from 'next/navigation';
import { db, assets } from '@/lib/db';
import { eq, sql, and, isNotNull, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import AssetCard from '@/components/AssetCard';
import { SITE_URL } from '@/lib/site-config';

interface PageProps {
  params: Promise<{
    author: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

const PAGE_SIZE = 12;

// Generate static params for all authors (limit to top 100 for build performance)
export async function generateStaticParams() {
  const authors = await db
    .select({ author: assets.author })
    .from(assets)
    .where(sql`${assets.author} IS NOT NULL AND ${assets.author} != ''`)
    .groupBy(assets.author)
    .orderBy(sql`count(*) DESC`)
    .limit(100);

  return authors
    .filter(a => a.author)
    .map(a => ({
      author: a.author!.replace(/\s+/g, '-'),
    }));
}

async function getAuthorStats(author: string) {
  const authorName = formatAuthorName(author);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(
      and(
        eq(assets.author, authorName),
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    );

  return result[0]?.count || 0;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { author } = await params;
  const { page = '1' } = await searchParams;
  const authorName = formatAuthorName(author);
  const currentPage = parseInt(page, 10);

  // Fetch total count for metadata
  const totalCount = await getAuthorStats(author);

  const title = currentPage > 1
    ? `${authorName} 3D Models - Page ${currentPage} | ModelBase`
    : `${authorName} 3D Models | Free Download | ModelBase`;

  const hasMore = totalCount > currentPage * PAGE_SIZE;

  return {
    title,
    description: `Browse ${currentPage > 1 ? `page ${currentPage} of ` : ''}${totalCount.toLocaleString()} 3D models by ${authorName}. Download free high-quality assets created by this author from the Objaverse dataset.`,
    keywords: [`${authorName} 3D models`, 'free 3D assets', 'Sketchfab', 'OBJ', 'GLTF', 'download'],
    robots: {
      index: currentPage === 1,
      follow: true,
    },
    alternates: {
      canonical: currentPage > 1 ? `/authors/${author}/?page=${currentPage}` : `/authors/${author}/`,
    },
    openGraph: {
      title: `${authorName} 3D Models | Free Download`,
      description: `Browse ${totalCount.toLocaleString()} 3D models by ${authorName} on ModelBase.`,
      type: 'website',
    },
    other: {
      ...(currentPage > 1 && { 'prev': `/authors/${author}/?page=${currentPage - 1}` }),
      ...(hasMore && { 'next': `/authors/${author}/?page=${currentPage + 1}` }),
    },
  };
}

function formatAuthorName(slug: string): string {
  return slug.replace(/-/g, ' ');
}

async function getAuthorAssets(author: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const authorName = formatAuthorName(author);

  const results = await db
    .select({
      uid: assets.uid,
      name: assets.name,
      thumbnail: assets.thumbnail,
      author: assets.author,
      face_count: assets.face_count,
      downloadable: assets.downloadable,
      category: assets.category,
    })
    .from(assets)
    .where(
      and(
        eq(assets.author, authorName),
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = results.length > PAGE_SIZE;
  const items = hasMore ? results.slice(0, PAGE_SIZE) : results;

  return { items, hasMore, currentPage: page, authorExists: items.length > 0 || page > 1 };
}

export default async function AuthorPage({ params, searchParams }: PageProps) {
  const { author } = await params;
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);
  const authorName = formatAuthorName(author);

  const { items, hasMore, authorExists: exists } = await getAuthorAssets(author, currentPage);
  const totalAssets = await getAuthorStats(author);

  // Only return 404 if the author doesn't exist at all
  if (items.length === 0 && currentPage === 1 && !exists) {
    notFound();
  }

  // Generate structured data
  const itemListStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${authorName} 3D Models`,
    itemListElement: items.map((asset, index) => ({
      '@type': 'ListItem',
      position: (currentPage - 1) * PAGE_SIZE + index + 1,
      item: {
        '@type': '3DModel',
        name: asset.name,
        url: `${SITE_URL}/models/${asset.uid}/`,
        image: asset.thumbnail,
        creator: {
          '@type': 'Person',
          name: authorName,
        },
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
        name: 'Authors',
        item: `${SITE_URL}/authors/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: authorName,
        item: `${SITE_URL}/authors/${author}/`,
      },
    ],
  };

  const personStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: authorName,
    url: `${SITE_URL}/authors/${author}/`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personStructuredData) }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm text-zinc-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-100">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/authors/" className="hover:text-zinc-100">Authors</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-100">{authorName}</span>
        </nav>

        {/* Author Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{authorName}</h1>
          <p className="text-zinc-400 text-lg">
            {totalAssets.toLocaleString()} free 3D models by this artist
          </p>
        </div>

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
                  category={asset.category}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4">
              {currentPage > 1 && (
                <Link
                  href={`/authors/${author}/?page=${currentPage - 1}`}
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
                  href={`/authors/${author}/?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </>
        ) : (
          <p className="text-zinc-400">No assets found by this author.</p>
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
