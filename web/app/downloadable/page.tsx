import { db, assets } from '@/lib/db';
import { eq, desc, sql, and, isNotNull, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import AssetCard from '@/components/AssetCard';
import { SITE_URL } from '@/lib/site-config';

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

const PAGE_SIZE = 12;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);

  const title = currentPage > 1
    ? `Free Downloadable 3D Models - Page ${currentPage} | ModelBase`
    : 'Free Downloadable 3D Models | 10,000+ Assets | ModelBase';

  return {
    title,
    description: `Browse ${currentPage > 1 ? `page ${currentPage} of ` : ''}free downloadable 3D models from the Objaverse dataset. High-quality OBJ, GLTF, and Sketchfab assets. No attribution required.`,
    keywords: ['free 3D models', 'downloadable 3D assets', 'free OBJ models', 'free GLTF', 'Sketchfab download', '3D library'],
    robots: {
      index: currentPage === 1,
      follow: true,
    },
    alternates: {
      canonical: currentPage > 1 ? `/downloadable/?page=${currentPage}` : `/downloadable/`,
    },
    openGraph: {
      title: 'Free Downloadable 3D Models | ModelBase',
      description: 'Browse and download free 3D models from the Objaverse dataset.',
      type: 'website',
    },
  };
}

async function getDownloadableAssets(page: number) {
  const offset = (page - 1) * PAGE_SIZE;

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
        eq(assets.downloadable, true),
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .orderBy(desc(assets.face_count))
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = results.length > PAGE_SIZE;
  const items = hasMore ? results.slice(0, PAGE_SIZE) : results;

  return { items, hasMore, currentPage: page };
}

async function getTotalDownloadableCount() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(
      and(
        eq(assets.downloadable, true),
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    );

  return result[0]?.count || 0;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default async function DownloadablePage({ searchParams }: PageProps) {
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);
  const { items, hasMore } = await getDownloadableAssets(currentPage);
  const totalCount = await getTotalDownloadableCount();

  // Generate structured data
  const itemListStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Free Downloadable 3D Models',
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
        name: 'Free Downloadable Models',
        item: `${SITE_URL}/downloadable/`,
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
          <span className="text-zinc-100">Free Downloadable Models</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Free Downloadable 3D Models</h1>
          <p className="text-zinc-400 text-lg">
            Browse {totalCount.toLocaleString()} free 3D models available for download. 
            High-quality OBJ, GLTF, GLB, and Sketchfab assets for Blender, Unity, Unreal Engine, and more.
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
                  href={`/downloadable/?page=${currentPage - 1}`}
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
                  href={`/downloadable/?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>

            {/* FAQ Structured Data */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
            />

            {/* FAQ Section */}
            <div className="mt-12 p-6 bg-zinc-900 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Free 3D Models FAQ</h2>
              <div className="space-y-4">
                <div itemScope itemType="https://schema.org/Question">
                  <h3 itemProp="name" className="font-semibold text-zinc-200">What formats are available?</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p itemProp="text" className="text-zinc-400 text-sm mt-1">Most models are available in OBJ, GLTF, GLB, and FBX formats compatible with Blender, Unity, Unreal Engine, and other 3D software.</p>
                  </div>
                </div>
                <div itemScope itemType="https://schema.org/Question">
                  <h3 itemProp="name" className="font-semibold text-zinc-200">Can I use these for commercial projects?</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p itemProp="text" className="text-zinc-400 text-sm mt-1">Many models are free for commercial use. Check the individual model license on Sketchfab for specific terms.</p>
                  </div>
                </div>
                <div itemScope itemType="https://schema.org/Question">
                  <h3 itemProp="name" className="font-semibold text-zinc-200">How do I download models?</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p itemProp="text" className="text-zinc-400 text-sm mt-1">Click on any model to view its details and download options. Models marked as "Free" are immediately downloadable.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-zinc-400">No downloadable assets found.</p>
        )}
      </div>
    </div>
  );
}

// Route segment config
export const revalidate = 86400; // 24 hours ISR

// FAQ Schema for this page
const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What formats are available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most models are available in OBJ, GLTF, GLB, and FBX formats compatible with Blender, Unity, Unreal Engine, and other 3D software.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use these for commercial projects?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Many models are free for commercial use. Check the individual model license on Sketchfab for specific terms.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I download models?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Click on any model to view its details and download options. Models marked as "Free" are immediately downloadable.',
      },
    },
  ],
};
