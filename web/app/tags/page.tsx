import { db, assets } from '@/lib/db';
import { desc, sql, isNotNull, and, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '3D Model Tags | Browse by Category | ModelBase',
  description: 'Browse 3D models by tags. Find assets by style, use case, format, and more. Free 3D model library organized by tags.',
  keywords: ['3D model tags', '3D assets by tag', 'free 3D models', '3D library tags', 'Sketchfab tags'],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/tags/',
  },
  openGraph: {
    title: '3D Model Tags | Browse by Category',
    description: 'Browse 3D models by tags on ModelBase.',
    type: 'website',
  },
};

interface TagData {
  tag: string;
  count: number;
}

async function getAllTags(): Promise<TagData[]> {
  const results = await db
    .select({
      tags: assets.tags,
    })
    .from(assets)
    .where(
      and(
        sql`${assets.tags} IS NOT NULL`,
        sql`${assets.tags} != ''`,
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    );

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

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function slugifyTag(tag: string): string {
  return tag.replace(/\s+/g, '-');
}

export default async function TagsPage() {
  const tags = await getAllTags();
  
  // Get top tags for featured section
  const popularTags = tags.slice(0, 30);
  const allTags = tags.slice(30);

  // Structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '3D Model Tags',
    itemListElement: popularTags.map((tag, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Thing',
        name: tag.tag,
        url: `${SITE_URL}/tags/${slugifyTag(tag.tag)}/`,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4 py-12">
        <nav className="mb-6 text-sm text-zinc-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-100">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-100">Tags</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">3D Model Tags</h1>
        <p className="text-xl text-zinc-400 mb-8">
          Browse {tags.length.toLocaleString()} tags to find exactly what you need
        </p>

        {/* Popular Tags Cloud */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Tags</h2>
          <div className="flex flex-wrap gap-3">
            {popularTags.map((tag) => {
              const size = Math.min(1 + Math.log10(tag.count) * 0.3, 1.5);
              return (
                <Link
                  key={tag.tag}
                  href={`/tags/${slugifyTag(tag.tag)}/`}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                  style={{ fontSize: `${size}rem` }}
                >
                  {tag.tag}
                  <span className="ml-2 text-xs text-zinc-400">({tag.count.toLocaleString()})</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* All Tags List */}
        {allTags.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">More Tags</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {allTags.map((tag) => (
                <Link
                  key={tag.tag}
                  href={`/tags/${slugifyTag(tag.tag)}/`}
                  className="flex items-center justify-between p-2 bg-zinc-900 rounded hover:bg-zinc-800 transition-colors text-sm"
                >
                  <span className="truncate">{tag.tag}</span>
                  <span className="text-xs text-zinc-400 ml-2">{tag.count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 p-6 bg-zinc-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">How to Use Tags</h3>
          <p className="text-zinc-400 text-sm">
            Tags help you find specific types of 3D models. Browse by style (low-poly, realistic), 
            use case (game-ready, printable), or format (OBJ, GLTF, FBX). Click any tag to see 
            all models with that tag.
          </p>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 86400;
