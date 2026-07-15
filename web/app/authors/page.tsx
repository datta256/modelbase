import { db, assets } from '@/lib/db';
import { desc, sql, isNotNull, and, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '3D Model Authors | Browse by Creator | ModelBase',
  description: 'Discover 3D model authors and creators on ModelBase. Browse thousands of free 3D assets organized by artist.',
  keywords: ['3D model authors', '3D artists', 'Sketchfab creators', 'free 3D models', '3D model library'],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/authors/',
  },
  openGraph: {
    title: '3D Model Authors | Browse by Creator',
    description: 'Discover 3D model authors and creators on ModelBase.',
    type: 'website',
  },
};

interface AuthorData {
  author: string;
  count: number;
}

async function getAllAuthors(): Promise<AuthorData[]> {
  const result = await db
    .select({
      author: assets.author,
      count: sql<number>`count(*)`,
    })
    .from(assets)
    .where(
      and(
        sql`${assets.author} IS NOT NULL`,
        sql`${assets.author} != ''`,
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .groupBy(assets.author)
    .orderBy(desc(sql`count(*)`));

  return result.filter(r => r.author !== null) as AuthorData[];
}

async function getAuthorSampleThumbnail(author: string): Promise<string | null> {
  const result = await db
    .select({ thumbnail: assets.thumbnail })
    .from(assets)
    .where(
      and(
        sql`${assets.author} = ${author}`,
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .orderBy(desc(assets.face_count))
    .limit(1);

  return result[0]?.thumbnail || null;
}

function slugifyAuthor(name: string): string {
  return name.replace(/\s+/g, '-');
}

export default async function AuthorsPage() {
  const authors = await getAllAuthors();
  
  // Get thumbnails for top authors
  const topAuthors = authors.slice(0, 50);
  const thumbnails: Record<string, string | null> = {};
  
  for (const author of topAuthors) {
    thumbnails[author.author] = await getAuthorSampleThumbnail(author.author);
  }

  // Structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '3D Model Authors',
    itemListElement: authors.slice(0, 20).map((author, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: author.author,
        url: `${SITE_URL}/authors/${slugifyAuthor(author.author)}/`,
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
          <span className="text-zinc-100">Authors</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">3D Model Authors</h1>
        <p className="text-xl text-zinc-400 mb-8">
          Discover {authors.length.toLocaleString()} talented 3D artists and creators
        </p>

        {/* Featured Authors */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Authors</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {topAuthors.slice(0, 18).map((author) => (
              <Link
                key={author.author}
                href={`/authors/${slugifyAuthor(author.author)}/`}
                className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors text-center group"
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-2xl group-hover:bg-zinc-700 transition-colors">
                  {thumbnails[author.author] ? (
                    <img
                      src={thumbnails[author.author]!}
                      alt={author.author}
                      className="w-full h-full rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="font-semibold text-sm line-clamp-1">{author.author}</div>
                <div className="text-xs text-zinc-400">{author.count.toLocaleString()} models</div>
              </Link>
            ))}
          </div>
        </div>

        {/* All Authors List */}
        <div>
          <h2 className="text-2xl font-bold mb-6">All Authors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {authors.map((author) => (
              <Link
                key={author.author}
                href={`/authors/${slugifyAuthor(author.author)}/`}
                className="flex items-center justify-between p-3 bg-zinc-900 rounded hover:bg-zinc-800 transition-colors"
              >
                <span className="font-medium truncate">{author.author}</span>
                <span className="text-sm text-zinc-400 ml-2">{author.count.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 86400;
