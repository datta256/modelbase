'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

interface SearchResult {
  uid: string;
  name: string;
  thumbnail: string | null;
  author: string | null;
  category: string | null;
  face_count: number | null;
  downloadable: boolean;
}

interface SearchResultsProps {
  results: SearchResult[];
}

function SearchCard({ asset }: { asset: SearchResult }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  if (imageError || !asset.thumbnail) {
    return null;
  }

  return (
    <Link
      href={`/models/${asset.uid}`}
      className="group block"
    >
      <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
        <div className="relative aspect-square bg-zinc-800">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
          )}
          <img
            ref={imgRef}
            src={asset.thumbnail}
            alt={asset.name}
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
            {asset.name}
          </h3>
          {asset.author && (
            <p className="text-sm text-zinc-400">{asset.author}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
            {asset.face_count && <span>{asset.face_count.toLocaleString()} faces</span>}
            {asset.category && <span>{asset.category}</span>}
          </div>
          {asset.downloadable && (
            <div className="mt-2">
              <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded-full text-xs">
                Free
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function SearchResults({ results }: SearchResultsProps) {
  // Filter out any assets with null/empty thumbnails as safety net
  const validResults = results.filter(asset => 
    asset.thumbnail && 
    asset.thumbnail !== '' && 
    !asset.thumbnail.includes('Not found')
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
      {validResults.map((asset) => (
        <SearchCard key={asset.uid} asset={asset} />
      ))}
    </div>
  );
}
