import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | ModelBase',
  description: 'The page you are looking for could not be found. Browse our collection of free 3D models.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-xl text-zinc-400 mb-8 max-w-md mx-auto">
          The 3D model or page you&apos;re looking for doesn&apos;t exist. 
          It may have been moved or deleted.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg transition-colors"
          >
            Browse Home
          </Link>
          <Link
            href="/downloadable/"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 font-semibold rounded-lg transition-colors"
          >
            Free Downloads
          </Link>
          <Link
            href="/category/"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 font-semibold rounded-lg transition-colors"
          >
            Categories
          </Link>
        </div>

        <div className="mt-12 text-sm text-zinc-500">
          <p>Popular searches:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <Link href="/search?q=chair" className="text-blue-400 hover:underline">Chair</Link>
            <span>•</span>
            <Link href="/search?q=car" className="text-blue-400 hover:underline">Car</Link>
            <span>•</span>
            <Link href="/search?q=tree" className="text-blue-400 hover:underline">Tree</Link>
            <span>•</span>
            <Link href="/search?q=building" className="text-blue-400 hover:underline">Building</Link>
            <span>•</span>
            <Link href="/search?q=character" className="text-blue-400 hover:underline">Character</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
