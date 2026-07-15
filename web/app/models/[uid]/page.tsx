import { notFound } from 'next/navigation';
import { db, assets } from '@/lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import RelatedModels from '@/components/RelatedModels';
import DownloadButton from '@/components/DownloadButton';
import { SITE_URL } from '@/lib/site-config';

export const revalidate = 86400;

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    uid: string;
  }>;
}

// Generate static params for all models (limit to most recent 1000 for build performance)
export async function generateStaticParams() {
  const models = await db
    .select({ uid: assets.uid })
    .from(assets)
    .where(sql`${assets.thumbnail} != ''`)
    .orderBy(desc(sql`rowid`))
    .limit(1000);

  return models.map((model) => ({
    uid: model.uid,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uid } = await params;
  const asset = await getAsset(uid);

  if (!asset) {
    return {
      title: 'Model Not Found | ModelBase',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${asset.name} - Free 3D Model Download | ModelBase`;
  const description = `Download "${asset.name}" 3D model by ${asset.author || 'Unknown'}. ${asset.face_count?.toLocaleString() || 0} faces, ${asset.vertex_count?.toLocaleString() || 0} vertices. ${asset.downloadable ? 'Free download available.' : ''} High-quality ${asset.category || '3D'} asset from Objaverse dataset.`;

  const keywords = [
    asset.name,
    asset.category || '',
    '3D model',
    'free download',
    'Sketchfab',
    'OBJ',
    'GLTF',
    'GLB',
    asset.author || '',
    '3D asset',
    'downloadable',
    'low poly',
    'Blender',
    'Unity',
    'Unreal Engine'
  ].filter(Boolean);

  return {
    title,
    description,
    keywords,
    authors: asset.author ? [{ name: asset.author }] : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: `${asset.name} - Free 3D Model`,
      description,
      images: asset.thumbnail ? [{ 
        url: asset.thumbnail, 
        width: 800, 
        height: 600,
        alt: `${asset.name} - 3D Model Preview`,
      }] : undefined,
      type: 'website',
      siteName: 'ModelBase',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${asset.name} - Free 3D Model`,
      description,
      images: asset.thumbnail ? [asset.thumbnail] : undefined,
    },
    alternates: {
      canonical: `/models/${uid}/`,
    },
    other: {
      'asset:category': asset.category || '',
      'asset:author': asset.author || '',
      'asset:faces': String(asset.face_count || 0),
      'asset:vertices': String(asset.vertex_count || 0),
    },
  };
}

async function getAsset(uid: string) {
  const results = await db
    .select({
      uid: assets.uid,
      name: assets.name,
      thumbnail: assets.thumbnail,
      author: assets.author,
      description: assets.description,
      face_count: assets.face_count,
      vertex_count: assets.vertex_count,
      texture_count: assets.texture_count,
      downloadable: assets.downloadable,
      category: assets.category,
      viewer_url: assets.viewer_url,
      embed_url: assets.embed_url,
      tags: assets.tags,
    })
    .from(assets)
    .where(eq(assets.uid, uid))
    .limit(1);

  return results[0] || null;
}

async function getRelatedModels(uid: string, name: string, category: string | null, tags: string | null) {
  // Build unique search terms for this specific model
  const searchTerms: string[] = [];

  // Extract key words from name (first 2-3 significant words)
  const nameWords = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  searchTerms.push(...nameWords);

  if (category) searchTerms.push(category);
  if (tags) {
    // Take first few tags
    const tagList = tags.split(',').slice(0, 2);
    searchTerms.push(...tagList);
  }

  // Remove duplicates and limit
  const uniqueTerms = [...new Set(searchTerms)].slice(0, 5);

  if (uniqueTerms.length === 0) {
    // Fallback: get random models from same category
    if (!category) return [];
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
        sql`${assets.category} = ${category} 
          AND ${assets.uid} != ${uid}
          AND ${assets.thumbnail} IS NOT NULL
          AND ${assets.thumbnail} != ''
          AND ${assets.thumbnail} NOT LIKE '%Not found%'`
      )
      .orderBy(sql`RANDOM()`)
      .limit(6);
    return results;
  }

  // Use FTS to find related models - wrap terms in quotes to escape special chars
  const query = uniqueTerms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR ');
  const results = await db.all(sql`
    SELECT
      assets.uid,
      assets.name,
      assets.thumbnail,
      assets.author,
      assets.face_count,
      assets.downloadable,
      assets.category
    FROM assets_fts
    JOIN assets ON assets.uid = assets_fts.uid
    WHERE assets_fts MATCH ${query}
      AND assets.uid != ${uid}
      AND assets.thumbnail IS NOT NULL
      AND assets.thumbnail != ''
      AND assets.thumbnail NOT LIKE '%Not found%'
    ORDER BY RANDOM()
    LIMIT 8
  `);

  return results as Array<{
    uid: string;
    name: string;
    thumbnail: string | null;
    author: string | null;
    face_count: number | null;
    downloadable: boolean;
    category: string | null;
  }>;
}

export default async function ModelPage({ params }: PageProps) {
  const { uid } = await params;
  const asset = await getAsset(uid);

  if (!asset) {
    notFound();
  }

  const relatedModels = await getRelatedModels(uid, asset.name, asset.category, asset.tags);

  // Generate structured data
  const modelStructuredData = {
    '@context': 'https://schema.org',
    '@type': '3DModel',
    name: asset.name,
    description: asset.description || `3D model ${asset.name} with ${asset.face_count} faces and ${asset.vertex_count} vertices`,
    image: asset.thumbnail,
    url: `${SITE_URL}/models/${uid}/`,
    creator: asset.author ? {
      '@type': 'Person',
      name: asset.author,
    } : undefined,
    license: asset.downloadable ? 'https://creativecommons.org/licenses/' : undefined,
    encoding: {
      '@type': 'MediaObject',
      contentUrl: asset.viewer_url,
      encodingFormat: 'model/gltf+json',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Face Count',
        value: asset.face_count || 0,
      },
      {
        '@type': 'PropertyValue',
        name: 'Vertex Count',
        value: asset.vertex_count || 0,
      },
      {
        '@type': 'PropertyValue',
        name: 'Texture Count',
        value: asset.texture_count || 0,
      },
      {
        '@type': 'PropertyValue',
        name: 'Downloadable',
        value: asset.downloadable ? 'Yes' : 'No',
      },
    ].filter(p => p.value !== undefined),
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
      ...(asset.category ? [{
        '@type': 'ListItem',
        position: 2,
        name: asset.category,
        item: `${SITE_URL}/category/${asset.category.toLowerCase()}/`,
      }] : []),
      {
        '@type': 'ListItem',
        position: asset.category ? 3 : 2,
        name: asset.name,
        item: `${SITE_URL}/models/${uid}/`,
      },
    ],
  };

  const relatedModelsStructuredData = relatedModels.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Related 3D Models',
    itemListElement: relatedModels.map((model, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': '3DModel',
        name: model.name,
        url: `${SITE_URL}/models/${model.uid}/`,
        image: model.thumbnail,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(modelStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      {relatedModelsStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedModelsStructuredData) }}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          {asset.category && (
            <>
              <Link href={`/category/${asset.category.toLowerCase()}`} className="hover:text-white">
                {asset.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-white truncate">{asset.name}</span>
        </div>

        <div className="flex flex-col gap-6">
            {/* 3D Viewer / Preview */}
            {asset.embed_url ? (
              <div className="aspect-video bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl overflow-hidden mb-8 border border-zinc-800/50 shadow-2xl">
                <iframe
                  src={asset.embed_url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  allowFullScreen
                  title={`${asset.name} - 3D Viewer`}
                />
              </div>
            ) : asset.thumbnail ? (
              <div className="aspect-video bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl overflow-hidden mb-8 border border-zinc-800/50 shadow-2xl">
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}

            {/* Details Card */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-8 border border-zinc-800/50 shadow-2xl">
              {/* Title Section */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                  {asset.name}
                </h1>
                {asset.author && (
                  <p className="text-zinc-400 text-lg">
                    by <span className="text-blue-400 font-medium">{asset.author}</span>
                    {asset.category && (
                      <span className="text-zinc-500"> in {asset.category}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {/* Faces */}
                <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-5 text-center border border-zinc-700/30 hover:border-zinc-600/50 transition-all group">
                  <div className="w-10 h-10 mx-auto mb-3 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white">{asset.face_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-zinc-400 mt-1">Faces</div>
                </div>

                {/* Vertices */}
                <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-5 text-center border border-zinc-700/30 hover:border-zinc-600/50 transition-all group">
                  <div className="w-10 h-10 mx-auto mb-3 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white">{asset.vertex_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-zinc-400 mt-1">Vertices</div>
                </div>

                {/* Textures */}
                <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-5 text-center border border-zinc-700/30 hover:border-zinc-600/50 transition-all group">
                  <div className="w-10 h-10 mx-auto mb-3 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white">{asset.texture_count || 0}</div>
                  <div className="text-sm text-zinc-400 mt-1">Textures</div>
                </div>

                {/* Downloadable */}
                <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-5 text-center border border-zinc-700/30 hover:border-zinc-600/50 transition-all group">
                  <div className={`w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${asset.downloadable ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <svg className={`w-5 h-5 ${asset.downloadable ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {asset.downloadable ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div className={`text-3xl font-bold ${asset.downloadable ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.downloadable ? 'Free' : 'No'}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">Download</div>
                </div>
              </div>

              {asset.description && (
                <div className="mb-8 p-5 bg-zinc-800/30 rounded-xl border-l-4 border-blue-500/50">
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</h2>
                  <p className="text-zinc-300 leading-relaxed">{asset.description}</p>
                </div>
              )}

              {asset.tags && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.split(',').map(tag => (
                      <Link
                        key={tag}
                        href={`/tags/${tag.trim().toLowerCase()}`}
                        className="px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-blue-400 rounded-full text-sm transition-all border border-zinc-700/30 hover:border-blue-500/30"
                      >
                        #{tag.trim()}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <DownloadButton 
                  uid={asset.uid} 
                  name={asset.name} 
                  downloadable={asset.downloadable} 
                />
                
                {asset.viewer_url && (
                  <a
                    href={asset.viewer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View in 3D
                  </a>
                )}
                
                {asset.author && (
                  <Link
                    href={`/authors/${encodeURIComponent(asset.author.replace(/\s+/g, '-'))}/`}
                    className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl transition-all flex items-center gap-2 border border-zinc-700 hover:border-zinc-600 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    More by {asset.author}
                  </Link>
                )}
              </div>
            </div>

            {/* Model Info Card */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 rounded-2xl p-6 border border-zinc-800/50">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Technical Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">UID</span>
                  <span className="font-mono text-sm text-zinc-300 break-all">{asset.uid}</span>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">Author</span>
                  <span className="text-sm text-zinc-300">{asset.author || 'Unknown'}</span>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">Category</span>
                  <Link 
                    href={asset.category ? `/category/${asset.category.toLowerCase()}/` : '/category/'}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {asset.category || 'Uncategorized'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Related Models - Full width at bottom */}
            {relatedModels.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
                  Related Models
                </h2>
                <RelatedModels models={relatedModels} />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
