import { Metadata } from 'next';
import { db, assets } from '@/lib/db';
import { sql, and, or, isNotNull, notLike } from 'drizzle-orm';
import Link from 'next/link';
import AssetCard from '@/components/AssetCard';
import {
  ALL_CATEGORY_SLUGS,
  BASE_CATEGORIES,
  getCategoryInfo,
  getCategorySearchPattern,
  getBaseCategory,
  generateTitle,
  generateDescription,
  generateKeywords,
  CATEGORY_PAGE_SIZE
} from '@/lib/categories';
import { SITE_URL } from '@/lib/site-config';

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return BASE_CATEGORIES.map(slug => ({
    slug: [slug]
  }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);
  const categorySlug = slug.join('/');
  const info = getCategoryInfo(categorySlug);
  const baseCategory = getBaseCategory(categorySlug);
  const isCanonicalCategory = categorySlug === baseCategory;
  
  // Generate description from slug parts for unique meta per page
  const uniqueDesc = `Download free ${info.title.toLowerCase()} 3D models. ${info.parts.slice(0, 2).join(', ')} assets for Blender, Unity, Unreal Engine. GLB, OBJ, FBX formats. Instant download, no registration.`;

  return {
    title: generateTitle(info),
    description: uniqueDesc,
    keywords: generateKeywords(info),
    alternates: {
      canonical: `${SITE_URL}/category/${baseCategory || categorySlug}/`,
    },
    openGraph: {
      title: `${info.title} 3D Models | ModelBase`,
      description: uniqueDesc,
      type: 'website',
      url: `${SITE_URL}/category/${categorySlug}/`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${info.title} 3D Models | ModelBase`,
      description: uniqueDesc,
    },
    robots: {
      index: currentPage === 1 && isCanonicalCategory,
      follow: true,
    },
  };
}

function buildCategoryFilter(slug: string) {
  const pattern = getCategorySearchPattern(slug);
  
  // Base conditions: has thumbnail
  const baseConditions: any[] = [
    sql`${assets.thumbnail} != ''`,
    isNotNull(assets.thumbnail),
    notLike(assets.thumbnail, '%Not found%'),
  ];
  
  // Match strictly on the category column only to avoid unrelated results
  if (pattern) {
    const searchTerms = pattern.split('|');
    const termConditions = searchTerms.map(term => {
      const t = '%' + term.toLowerCase() + '%';
      return sql`LOWER(${assets.category}) LIKE ${t}`;
    });
    baseConditions.push(or(...termConditions));
  }
  
  return and(...baseConditions);
}

function slugSeed(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = Math.imul(31, h) + slug.charCodeAt(i) | 0;
  }
  return Math.abs(h) % 1000000;
}

async function getCategoryModels(slug: string, page: number = 1) {
  const offset = (page - 1) * CATEGORY_PAGE_SIZE;
  const whereClause = buildCategoryFilter(slug);
  const seed = slugSeed(slug);

  const results = await db
    .select({
      uid: assets.uid,
      name: assets.name,
      description: assets.description,
      tags: assets.tags,
      thumbnail: assets.thumbnail,
      author: assets.author,
      face_count: assets.face_count,
      downloadable: assets.downloadable,
      category: assets.category,
    })
    .from(assets)
    .where(whereClause)
    .orderBy(sql`(CAST(SUBSTR(uid, 1, 8) AS INTEGER) + ${seed}) % 1000000`)
    .limit(CATEGORY_PAGE_SIZE)
    .offset(offset);

  return results;
}

// Generate unique content from model tags and descriptions
function generateCategoryContent(models: any[], info: any): { intro: string; tags: string[] } {
  // Collect all tags and descriptions
  const allTags = new Set<string>();
  const descriptions: string[] = [];

  for (const model of models) {
    if (model.tags) {
      model.tags.split(/\s+/).forEach((t: string) => {
        if (t.length > 2) allTags.add(t.toLowerCase().replace(/[_-]/g, ' '));
      });
    }
    if (model.description && model.description.length > 10) {
      descriptions.push(model.description);
    }
  }

  // Get top 8 most relevant tags
  const sortedTags = Array.from(allTags)
    .filter(t => !['the', 'and', 'for', 'with', 'from'].includes(t))
    .slice(0, 8);

  // Build intro from first good description or tags
  let intro: string;
  const firstGoodDesc = descriptions.find(d => d.length > 20);

  if (firstGoodDesc) {
    // Use first real description as intro
    const cleanDesc = firstGoodDesc.replace(/\s+/g, ' ').trim();
    const shortDesc = cleanDesc.length > 150 ? cleanDesc.slice(0, 150) + '...' : cleanDesc;
    intro = `${shortDesc} Browse ${info.title.toLowerCase()} 3D models for Blender, Unity, Unreal Engine, and more. Download free GLB, OBJ, FBX formats.`;
  } else if (sortedTags.length > 0) {
    // Use tags if no description
    intro = `Download free ${info.title.toLowerCase()} 3D models tagged with ${sortedTags.slice(0, 5).join(', ')}. High-quality assets for game development, 3D printing, and rendering. Compatible with Blender, Unity, Unreal Engine, and all major 3D software.`;
  } else {
    // Fallback
    intro = `Download free ${info.title.toLowerCase()} 3D models for your projects. Compatible with Blender, Unity, Unreal Engine, and all major 3D software.`;
  }

  return { intro, tags: sortedTags };
}

// Get related categories for internal linking
function getRelatedCategories(slug: string): string[] {
  const base = getBaseCategory(slug);
  if (!base) return [];
  
  // Find categories that share the same base
  const related = ALL_CATEGORY_SLUGS
    .filter(s => s !== slug && getBaseCategory(s) === base)
    .slice(0, 6); // Max 6 related
  
  return related;
}

async function getTotalCount(slug: string): Promise<number> {
  const whereClause = buildCategoryFilter(slug);
  
  const result = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(assets)
    .where(whereClause);
  return result[0]?.count ?? 0;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const categorySlug = slug.join('/');
  const info = getCategoryInfo(categorySlug);

  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);

  const models = await getCategoryModels(categorySlug, currentPage);
  const totalCount = await getTotalCount(categorySlug);
  const totalPages = Math.ceil(totalCount / CATEGORY_PAGE_SIZE);
  const hasMore = currentPage < totalPages;
  
  // Generate unique content from models
  const { intro, tags } = generateCategoryContent(models, info);
  const relatedCategories = getRelatedCategories(categorySlug);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/category/" className="hover:text-white">Categories</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{info.title}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">{info.title} 3D Models</h1>
        <p className="text-zinc-400 mb-4 max-w-2xl leading-relaxed">
          {intro}
        </p>
        
        {/* Tags from models */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-zinc-400 border border-zinc-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-6 mb-8 text-sm text-zinc-500">
          <span>{totalCount.toLocaleString()} models</span>
          <span>•</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>

        {models.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {models.map((asset) => (
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

            <div className="flex justify-center gap-4 mt-12">
              {currentPage > 1 && (
                <Link
                  href={`/category/${categorySlug}/?page=${currentPage - 1}`}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Previous
                </Link>
              )}
              {hasMore && (
                <Link
                  href={`/category/${categorySlug}/?page=${currentPage + 1}`}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-lg">No models found in this category.</p>
            <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
              Browse all models
            </Link>
          </div>
        )}
        
        {/* Related Categories - Internal Linking */}
        {relatedCategories.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-800">
            <h2 className="text-2xl font-bold mb-6 text-white">Related Categories</h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map(cat => {
                const catInfo = getCategoryInfo(cat);
                return (
                  <Link
                    key={cat}
                    href={`/category/${cat}/`}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
                  >
                    {catInfo.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
