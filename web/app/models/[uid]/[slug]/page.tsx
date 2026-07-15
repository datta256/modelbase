import { notFound, permanentRedirect } from 'next/navigation';
import { db, assets } from '@/lib/db';
import { eq, like, sql, and, ne, isNotNull, notLike } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import type { Asset } from '@/drizzle/schema';
import AssetCard from '@/components/AssetCard';

interface PageProps {
  params: Promise<{
    uid: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uid } = await params;
  const asset = await getAsset(uid);

  if (!asset) {
    return {
      title: 'Asset Not Found | ModelBase',
    };
  }

  const title = asset.downloadable
    ? `${asset.name} — Free 3D Model | ModelBase`
    : `${asset.name} — 3D Model | ModelBase`;

  const description = asset.description
    ? asset.description.slice(0, 155)
    : `Download ${asset.name}, a ${asset.category || '3D'} model with ${asset.face_count || 0} faces.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: asset.thumbnail || '',
          width: 1200,
          height: 630,
          alt: asset.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [asset.thumbnail || ''],
    },
    alternates: {
      canonical: `/models/${uid}/`,
    },
  };
}

async function getAsset(uid: string) {
  const result = await db.select().from(assets).where(eq(assets.uid, uid)).limit(1);
  return result[0] || null;
}

async function getRelatedAssets(currentAsset: Asset, limit = 8) {
  const conditions = [];

  // Same category
  if (currentAsset.category) {
    conditions.push(eq(assets.category, currentAsset.category));
  }

  // Exclude current asset
  conditions.push(ne(assets.uid, currentAsset.uid));

  // Filter out assets without thumbnails or with "Not found."
  conditions.push(sql`${assets.thumbnail} != ''`);
  conditions.push(isNotNull(assets.thumbnail));
  conditions.push(notLike(assets.thumbnail, '%Not found%'));

  // If we have tags, try to match at least one tag
  if (currentAsset.tags) {
    const tagConditions = currentAsset.tags.split(' ').map((tag: string) =>
      like(assets.tags, `%${tag}%`)
    );
    // Combine with OR for tags, AND with category
    if (conditions.length > 1) {
      // We have category condition, so we want (category AND (tag1 OR tag2 OR ...))
      // This is complex in Drizzle, so we'll simplify: just use category for now
    }
  }

  let related;
  if (conditions.length > 0) {
    related = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .limit(limit);
  }

  // If no results from category, just get random assets
  if (!related || related.length === 0) {
    related = await db
      .select()
      .from(assets)
      .where(
        and(
          ne(assets.uid, currentAsset.uid),
          sql`${assets.thumbnail} != ''`,
          isNotNull(assets.thumbnail),
          notLike(assets.thumbnail, '%Not found%')
        )
      )
      .limit(limit);
  }

  return related;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default async function AssetPage({ params }: PageProps) {
  const { uid, slug } = await params;
  const asset = (await getAsset(uid))!;

  if (!asset) {
    notFound();
  }

  permanentRedirect(`/models/${uid}/`);

  const relatedAssets = await getRelatedAssets(asset);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': '3DModel',
    name: asset.name,
    description: asset.description || '',
    thumbnailUrl: asset.thumbnail || '',
    encodingFormat: 'model/gltf-binary',
    author: asset.author ? { '@type': 'Person', name: asset.author } : undefined,
    isAccessibleForFree: asset.downloadable,
    keywords: asset.tags || '',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-zinc-400">
            <a href="/" className="hover:text-zinc-100">Home</a>
            {asset.category && (
              <>
                <span className="mx-2">›</span>
                <a href={`/category/${(asset.category ?? '').toLowerCase()}`} className="hover:text-zinc-100">
                  {asset.category}
                </a>
              </>
            )}
            <span className="mx-2">›</span>
            <span className="text-zinc-100">{asset.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-bold mb-4">{asset.name}</h1>

              {/* 3D Viewer */}
              {asset.embed_url ? (
                <div className="aspect-video w-full mb-6 rounded-lg overflow-hidden bg-zinc-900">
                  <iframe
                    src={asset.embed_url || undefined}
                    className="w-full h-full"
                    allowFullScreen
                    title={asset.name}
                  />
                </div>
              ) : asset.viewer_url ? (
                <a
                  href={asset.viewer_url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video w-full mb-6 rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-zinc-400">View on Sketchfab</span>
                </a>
              ) : (
                <div className="aspect-video w-full mb-6 rounded-lg bg-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-500">No preview available</span>
                </div>
              )}

              {/* Description */}
              {asset.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Description</h2>
                  <p className="text-zinc-300 whitespace-pre-wrap">{asset.description}</p>
                </div>
              )}

              {/* Tags */}
              {asset.tags && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {(asset.tags ?? '').split(' ').map((tag, i) => (
                      <a
                        key={i}
                        href={`/tags/${tag.toLowerCase()}`}
                        className="px-3 py-1 bg-zinc-800 rounded-full text-sm hover:bg-zinc-700 transition-colors"
                      >
                        {tag}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Author */}
              {asset.author && (
                <div className="bg-zinc-900 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Author</h3>
                  <a
                    href={`/authors/${(asset.author ?? '').toLowerCase()}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {asset.author}
                  </a>
                </div>
              )}

              {/* Specs */}
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Specifications</h3>
                <dl className="space-y-2 text-sm">
                  {asset.face_count !== null && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Faces</dt>
                      <dd>{(asset.face_count ?? 0).toLocaleString()}</dd>
                    </div>
                  )}
                  {asset.vertex_count !== null && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Vertices</dt>
                      <dd>{(asset.vertex_count ?? 0).toLocaleString()}</dd>
                    </div>
                  )}
                  {asset.texture_count !== null && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Textures</dt>
                      <dd>{asset.texture_count}</dd>
                    </div>
                  )}
                  {asset.category && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Category</dt>
                      <dd>
                        <a
                          href={`/category/${(asset.category ?? '').toLowerCase()}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {asset.category}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Downloadable</dt>
                    <dd>{asset.downloadable ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </div>

              {/* Download CTA */}
              {asset.downloadable && asset.uri && (
                <a
                  href={asset.uri || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-center font-semibold rounded-lg transition-colors"
                >
                  Download Model
                </a>
              )}
            </div>
          </div>

          {/* Related Models */}
          {relatedAssets.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Related Models</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedAssets.map((related) => (
                  <AssetCard
                    key={related.uid}
                    uid={related.uid}
                    name={related.name}
                    thumbnail={related.thumbnail}
                    author={related.author}
                    faceCount={related.face_count}
                    downloadable={related.downloadable}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const revalidate = 86400; // 24 hours ISR
