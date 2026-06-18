import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import SearchResults from '@/components/SearchResults';
import { SITE_URL } from '@/lib/site-config';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q || '';
  
  if (query) {
    return {
      title: `${query} - 3D Model Search | ModelBase`,
      description: `Search results for "${query}" - Find free 3D models matching your search. Browse downloadable OBJ, GLTF, and Sketchfab assets.`,
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        title: `${query} - 3D Model Search | ModelBase`,
        description: `Search results for "${query}" - Find free 3D models matching your search.`,
      },
    };
  }
  
  return {
    title: 'Search 3D Models | ModelBase',
    description: 'Search thousands of free 3D models from the Objaverse dataset. Find OBJ, GLTF, and Sketchfab assets by category, tag, or keyword.',
    robots: {
      index: true,
      follow: true,
    },
  };
}

async function searchAssets(query: string) {
  // Use SQLite FTS for better search matching tags, name, description
  // No ORDER BY - uses FTS ranking by default (matches old frontend)
  // Escape special characters by wrapping in quotes
  const escapedQuery = query.split(/\s+/).map(t => `"${t.replace(/"/g, '""')}"`).join(' ');
  const results = await db.all(sql`
    SELECT
      assets.uid,
      assets.name,
      assets.thumbnail,
      assets.author,
      assets.face_count,
      assets.vertex_count,
      assets.downloadable,
      assets.category
    FROM assets_fts
    JOIN assets ON assets.uid = assets_fts.uid
    WHERE assets_fts MATCH ${escapedQuery}
      AND assets.thumbnail IS NOT NULL
      AND assets.thumbnail != ''
      AND assets.thumbnail NOT LIKE '%Not found%'
    LIMIT 100
  `);

  return results as Array<{
    uid: string;
    name: string;
    thumbnail: string | null;
    author: string | null;
    face_count: number | null;
    vertex_count: number | null;
    downloadable: boolean;
    category: string | null;
  }>;
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const revalidate = 86400;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || '';
  const results = query ? await searchAssets(query) : [];

  // Generate structured data for search results
  const searchStructuredData = query && results.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: `${query} - 3D Model Search Results`,
    url: `${SITE_URL}/search?q=${encodeURIComponent(query)}`,
    mainEntity: {
      '@type': 'ItemList',
      name: 'Search Results',
      itemListElement: results.slice(0, 10).map((asset, index) => ({
        '@type': 'ListItem',
        position: index + 1,
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
    },
  } : null;

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
        name: query ? `Search: ${query}` : 'Search',
        item: query 
          ? `${SITE_URL}/search?q=${encodeURIComponent(query)}`
          : `${SITE_URL}/search/`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {searchStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(searchStructuredData) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <div className="container mx-auto px-4 py-12">
        <nav className="mb-6 text-sm text-zinc-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-100">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-100">{query ? `Search: ${query}` : 'Search'}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">{query ? `Results for "${query}"` : 'Search 3D Models'}</h1>
        
        {query ? (
          <p className="text-xl text-zinc-400 mb-8">
            Found {results.length} results for &quot;{query}&quot;
          </p>
        ) : (
          <p className="text-xl text-zinc-400 mb-8">
            Enter a search term to find 3D models
          </p>
        )}

        {results.length > 0 ? (
          <SearchResults results={results} />
        ) : query ? (
          <div className="text-center py-16 text-zinc-500">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl">No models found matching &quot;{query}&quot;</p>
            <p className="text-zinc-600 mt-2">Try a different search term</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
