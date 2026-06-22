import { db, assets } from '@/lib/db';
import { eq, desc, sql, and, isNotNull, notLike } from 'drizzle-orm';
import Link from 'next/link';
import { Metadata } from 'next';
import AssetCard from '@/components/AssetCard';
import CategoryThumbnail from '@/components/CategoryThumbnail';
import SearchBar from '@/components/SearchBar';
import { SITE_URL } from '@/lib/site-config';

// BRAND: ModelBase
// POSITIONING: Universal 3D model library for all creators
export const metadata: Metadata = {
  title: 'Free 3D Models Download | 10,000+ GLB OBJ GLTF Assets',
  description: 'Download free 3D models for Blender, Unity, Unreal Engine, game development, 3D printing, and animation. 10,000+ high-quality GLB, OBJ, GLTF, FBX assets. No registration required.',
  keywords: [
    // Core 3D model searches
    'free 3d models',
    '3d model download',
    '3d models free download',
    'download 3d models',
    '3d model library',
    '3d assets free',
    'free 3d assets',
    // Format-specific
    'free glb models',
    'free obj models',
    'free gltf models',
    'free fbx models',
    'glb download',
    'obj download',
    // Software-specific
    'blender models free',
    'blender 3d models',
    'unity 3d models',
    'unreal engine assets',
    'unreal engine free assets',
    'maya models free',
    '3ds max models free',
    'cinema 4d models',
    'godot 3d models',
    // Use-case specific
    'free game assets',
    'game 3d models',
    '3d printing models',
    'stl models free',
    'vr 3d models',
    'ar 3d models',
    'low poly models',
    'low poly assets',
    '3d character models free',
    'free 3d characters',
    '3d architecture models',
    '3d furniture models',
    '3d vehicle models',
    '3d animal models',
    '3d nature models',
    '3d prop models',
    '3d weapon models',
    // Long-tail combinations
    'free 3d models for commercial use',
    'free 3d models no attribution',
    'free rigged 3d models',
    'free animated 3d models',
    'free pbr 3d models',
    'free textured 3d models',
    'free hd 3d models'
  ],
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: 'Free 3D Models | 10,000+ Assets for Blender, Unity, Unreal',
    description: 'Download 10,000+ free 3D models for game dev, 3D printing, animation. GLB, OBJ, GLTF, FBX formats. No registration.',
    type: 'website',
    url: `${SITE_URL}/`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free 3D Models | 10,000+ Assets',
    description: '10,000+ free 3D models for Blender, Unity, Unreal. Instant download.',
  },
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
};

async function getFeaturedAssets(limit = 4) {
  return db
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
        eq(assets.downloadable, true),
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .orderBy(desc(assets.face_count))
    .limit(limit);
}

async function getPopularCategories(limit = 6) {
  const result = await db
    .select({
      category: assets.category,
      count: sql<number>`count(*)`,
    })
    .from(assets)
    .where(sql`${assets.category} IS NOT NULL`)
    .groupBy(assets.category)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return result.filter(r => r.category !== null);
}

async function getCategoryThumbnails(categories: string[]) {
  const thumbnails: Record<string, string[]> = {};
  if (categories.length === 0) return thumbnails;

  // Batch: one query per category using UNION ALL equivalent via Promise.all with LIMIT 4 each
  const results = await Promise.all(
    categories.map(category =>
      db
        .select({ category: assets.category, thumbnail: assets.thumbnail })
        .from(assets)
        .where(
          and(
            eq(assets.category, category),
            sql`${assets.thumbnail} != ''`,
            isNotNull(assets.thumbnail)
          )
        )
        .limit(4)
    )
  );

  for (const rows of results) {
    for (const row of rows) {
      if (!row.category || !row.thumbnail) continue;
      if (!thumbnails[row.category]) thumbnails[row.category] = [];
      thumbnails[row.category].push(row.thumbnail);
    }
  }

  return thumbnails;
}

async function getRecentAssets(limit = 8) {
  return db
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
        sql`${assets.thumbnail} != ''`,
        isNotNull(assets.thumbnail),
        notLike(assets.thumbnail, '%Not found%')
      )
    )
    .orderBy(desc(sql`rowid`))
    .limit(limit);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const revalidate = 3600;

export default async function Home() {
  const popularCategoriesRaw = await getPopularCategories(8);
  const popularCategories = popularCategoriesRaw
    .filter(cat => cat.category !== null && cat.category !== '')
    .slice(0, 6);
  const categoryThumbnails = await getCategoryThumbnails(
    popularCategories.map(c => c.category!).filter(Boolean)
  );

  const [featuredAssetsRaw, recentAssetsRaw] = await Promise.all([
    getFeaturedAssets(20),
    getRecentAssets(24),
  ]);

  // Filter out assets with null/empty/broken thumbnails
  const featuredAssets = featuredAssetsRaw
    .filter(a => a.thumbnail && a.thumbnail !== '' && !a.thumbnail.includes('Not found'))
    .slice(0, 8);

  const recentAssets = recentAssetsRaw
    .filter(a => a.thumbnail && a.thumbnail !== '' && !a.thumbnail.includes('Not found'))
    .slice(0, 12);

  // Generate homepage structured data
  const homeStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'ModelBase — Free 3D Model Library',
    description: 'Discover and download thousands of free 3D models from the Objaverse dataset.',
    url: `${SITE_URL}/`,
    mainEntity: {
      '@type': 'ItemList',
      name: 'Featured 3D Models',
      itemListElement: featuredAssets.slice(0, 8).map((asset, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': '3DModel',
          name: asset.name,
          url: `${SITE_URL}/models/${asset.uid}/`,
          image: asset.thumbnail,
        },
      })),
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
      </div>
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      
      {/* Hero Section */}
      <div className="relative container mx-auto px-4 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/80 border border-zinc-700/50 backdrop-blur-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-sm font-medium text-zinc-300">
            10,000+ Free 3D Models Available
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Free 3D Models
          <br />
          <span className="text-blue-400">For Every Creator</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-400 mb-6 max-w-3xl mx-auto leading-relaxed">
          Download 10,000+ free 3D assets for <strong className="text-white">Blender, Unity, Unreal Engine,</strong> game development, 
          3D printing, animation, and VR/AR projects.
        </p>

        {/* Use Case Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['Game Dev', '3D Printing', 'Animation', 'Architecture', 'VR/AR', 'Motion Design'].map((use) => (
            <span key={use} className="px-3 py-1 bg-zinc-800/80 rounded-full text-sm text-zinc-400 border border-zinc-700">
              {use}
            </span>
          ))}
        </div>

        {/* Value Props */}
        <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-zinc-400">
          {[
            { icon: '✓', text: 'No registration' },
            { icon: '✓', text: 'Instant download' },
            { icon: '✓', text: 'All formats (GLB/OBJ/GLTF/FBX)' },
            { icon: '✓', text: 'Commercial use OK' },
          ].map((prop) => (
            <span key={prop.text} className="flex items-center gap-1.5">
              <span className="text-green-500">{prop.icon}</span>
              {prop.text}
            </span>
          ))}
        </div>
        
        {/* Search */}
        <div className="flex justify-center mb-10 max-w-2xl mx-auto">
          <SearchBar />
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/downloadable/"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Browse Free Models
          </Link>
          <Link
            href="/category/"
            className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Explore Categories
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-12">
          {[
            { label: '3D Models', value: '10K+' },
            { label: 'Categories', value: '50+' },
            { label: 'Artists', value: '1000+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Categories */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-zinc-100">
            Popular Categories
          </h2>
          <p className="text-center text-zinc-400 mb-14 max-w-2xl mx-auto text-lg">
            Browse the most popular 3D model categories with thousands of free downloads
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularCategories.map((cat) => {
                const thumbs = categoryThumbnails[cat.category!] || [];
                return (
                  <Link
                    key={cat.category}
                    href={`/category/${cat.category!.toLowerCase()}/`}
                    className="group bg-zinc-900/80 hover:bg-zinc-800 rounded-2xl p-6 text-center transition-all border border-zinc-800 hover:border-zinc-600 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1"
                  >
                    <div className="aspect-[4/3] mb-5 rounded-xl overflow-hidden bg-zinc-800 relative">
                      <CategoryThumbnail thumbs={thumbs} />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="font-bold text-xl text-zinc-100 group-hover:text-white mb-2">{cat.category}</div>
                    <div className="text-zinc-400 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {cat.count.toLocaleString()} models
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>

      {/* Featured Assets */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-10 text-zinc-100">
          Featured Free Models
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredAssets.map((asset, index) => (
            <AssetCard
              key={asset.uid}
              uid={asset.uid}
              name={asset.name}
              thumbnail={asset.thumbnail}
              author={asset.author}
              faceCount={asset.face_count}
              downloadable={asset.downloadable}
              priority={index < 4}
            />
          ))}
        </div>
      </div>

      {/* Recent Additions */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-10 text-zinc-100">
          Recent Additions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recentAssets.map((asset) => (
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
      </div>

      {/* Features & Benefits */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center text-white">
            Everything You Need for 3D Projects
          </h2>
          <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
            Professional-quality 3D models for every use case. From indie game dev to Hollywood VFX.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { 
                title: 'Game Development', 
                desc: 'Low-poly and optimized models for Unity, Unreal, Godot.',
                icon: '🎮'
              },
              { 
                title: '3D Printing', 
                desc: 'Print-ready STL, OBJ models with proper topology.',
                icon: '🖨️'
              },
              { 
                title: 'Architecture', 
                desc: 'Furniture, buildings, interiors for visualization.',
                icon: '🏗️'
              },
              { 
                title: 'Animation', 
                desc: 'Characters, props, environments for film and motion.',
                icon: '🎬'
              },
              { 
                title: 'VR & AR', 
                desc: 'Optimized assets for immersive experiences.',
                icon: '🥽'
              },
              { 
                title: 'Product Design', 
                desc: 'Vehicles, electronics, industrial models.',
                icon: '📦'
              },
              { 
                title: 'Nature & Environment', 
                desc: 'Trees, rocks, terrain for outdoor scenes.',
                icon: '🌳'
              },
              { 
                title: 'Characters', 
                desc: 'Humans, animals, creatures with rigs.',
                icon: '👤'
              },
            ].map((item) => (
              <div key={item.title} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Supported Software */}
          <div className="text-center mb-12">
            <h3 className="text-lg font-semibold text-zinc-300 mb-4">Compatible With All 3D Software</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {['Blender', 'Unity', 'Unreal Engine', 'Maya', '3ds Max', 'Cinema 4D', 'Godot', 'Houdini', 'ZBrush', 'Substance', 'Fusion 360', 'SketchUp'].map((software) => (
                <span 
                  key={software}
                  className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-zinc-400 border border-zinc-700"
                >
                  {software}
                </span>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '10,000+', label: '3D Models' },
              { value: '50+', label: 'Categories' },
              { value: '∞', label: 'Use Cases' },
            ].map((stat) => (
              <div 
                key={stat.label} 
                className="text-center p-6 bg-zinc-900 rounded-xl border border-zinc-800"
              >
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-12 border-t border-zinc-800">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">ModelBase</p>
          <p className="mb-2 text-zinc-400">The Best Sketchfab Alternative</p>
          <p className="mb-6 text-zinc-500">Free 3D Models for Everyone</p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
            <Link href="/category/" className="text-zinc-400 hover:text-white transition-colors">Categories</Link>
            <Link href="/downloadable/" className="text-zinc-400 hover:text-white transition-colors">Free Downloads</Link>
            <Link href="/authors/" className="text-zinc-400 hover:text-white transition-colors">Artists</Link>
            <Link href="/tags/" className="text-zinc-400 hover:text-white transition-colors">Tags</Link>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-zinc-600 mb-4">
              ModelBase provides free 3D models for creators worldwide. Compatible with all major 3D software.
            </p>
            <p className="text-xs text-zinc-700">
              © 2024 ModelBase — Free 3D Models Library
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
