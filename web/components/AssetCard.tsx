'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface AssetCardProps {
  uid: string;
  name: string;
  thumbnail: string | null;
  author?: string | null;
  faceCount?: number | null;
  downloadable: boolean;
  category?: string | null;
  priority?: boolean;
}

export default function AssetCard({
  uid,
  name,
  thumbnail,
  author,
  faceCount,
  downloadable,
  category,
  priority = false,
}: AssetCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [clicking, setClicking] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  if (imageError || !thumbnail) {
    return null;
  }

  return (
    <Link
      href={`/models/${uid}`}
      className="group block"
      onClick={() => setClicking(true)}
    >
      <div className="bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-colors">
        <div className="relative aspect-square bg-zinc-800">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
          )}
          <img
            ref={imgRef}
            src={thumbnail}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
          />
          {clicking && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          {author && (
            <p className="text-sm text-zinc-400">{author}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
            {faceCount && <span>{faceCount.toLocaleString()} faces</span>}
            {category && <span>{category}</span>}
          </div>
          {downloadable && (
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
