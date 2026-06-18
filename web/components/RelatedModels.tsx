'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

interface RelatedModel {
  uid: string;
  name: string;
  thumbnail: string | null;
  category: string | null;
  face_count: number | null;
  downloadable: boolean;
}

interface RelatedModelsProps {
  models: RelatedModel[];
}

function RelatedCard({ model }: { model: RelatedModel }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  if (imageError || !model.thumbnail) {
    return null;
  }

  return (
    <Link
      href={`/models/${model.uid}`}
      className="group block"
    >
      <div className="bg-zinc-800 rounded-lg overflow-hidden hover:bg-zinc-700 transition-colors">
        <div className="relative aspect-square bg-zinc-800">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
          )}
          <img
            ref={imgRef}
            src={model.thumbnail}
            alt={model.name}
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
            {model.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            {model.face_count && <span>{model.face_count.toLocaleString()} faces</span>}
          </div>
          {model.downloadable && (
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

export default function RelatedModels({ models }: RelatedModelsProps) {
  // Filter out any models with null/empty thumbnails
  const validModels = models.filter(model => 
    model.thumbnail && 
    model.thumbnail !== '' && 
    !model.thumbnail.includes('Not found')
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {validModels.map(model => (
        <RelatedCard key={model.uid} model={model} />
      ))}
    </div>
  );
}
