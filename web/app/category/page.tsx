import { Metadata } from 'next';
import Link from 'next/link';
import {
  ALL_CATEGORY_SLUGS,
  getCategoryInfo,
  BASE_CATEGORIES,
  SOFTWARE_LIST,
} from '@/lib/categories';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '3D Model Categories | Browse by Software, Format, Style',
  description: 'Browse 2,400+ 3D model categories. Filter by Blender, Unity, Unreal, format (GLB, OBJ, GLTF), style (low-poly, realistic), and use case.',
  keywords: ['3D model categories', 'free 3D models', 'Blender models', 'Unity assets', 'GLB models', 'OBJ models'],
  alternates: {
    canonical: `${SITE_URL}/category/`,
  },
  openGraph: {
    title: '3D Model Categories | Browse by Software & Format',
    description: 'Browse 2,400+ categories of free 3D models.',
    type: 'website',
  },
};

export const revalidate = 86400;

// Group categories by base category
function getCategoriesByBase() {
  const grouped: Record<string, string[]> = {};
  
  for (const slug of ALL_CATEGORY_SLUGS) {
    const parts = slug.split('-');
    // Find the base category
    let baseIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      const candidate = parts.slice(i).join('-');
      if (BASE_CATEGORIES.includes(candidate as any)) {
        baseIndex = i;
        break;
      }
    }
    
    const base = baseIndex >= 0 ? parts.slice(baseIndex).join('-') : 'other';
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(slug);
  }
  
  return grouped;
}

export default async function CategoriesPage() {
  const grouped = getCategoriesByBase();
  const sortedBases = Object.keys(grouped).sort();
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="text-sm text-zinc-400 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Categories</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">3D Model Categories</h1>
        <p className="text-zinc-400 mb-8 max-w-2xl">
          Browse {ALL_CATEGORY_SLUGS.length.toLocaleString()} categories of free 3D models. 
          Filter by software (Blender, Unity, Unreal), format (GLB, OBJ, GLTF), style, and use case.
        </p>

        {/* Popular Software Quick Links */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Popular Software</h2>
          <div className="flex flex-wrap gap-3">
            {SOFTWARE_LIST.slice(0, 8).map(software => (
              <Link
                key={software}
                href={`/category/${software}/`}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors capitalize"
              >
                {software.replace('-', ' ')}
              </Link>
            ))}
          </div>
        </div>

        {/* All Categories by Base */}
        <div className="space-y-12">
          {sortedBases.map(base => {
            const categories = grouped[base].slice(0, 12); // Show top 12 per base
            return (
              <div key={base}>
                <h2 className="text-2xl font-bold mb-4 capitalize">{base.replace(/-/g, ' ')} Models</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {categories.map(slug => {
                    const info = getCategoryInfo(slug);
                    return (
                      <Link
                        key={slug}
                        href={`/category/${slug}/`}
                        className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors text-sm"
                      >
                        {info.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
