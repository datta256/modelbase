'use client';

import { useState, useCallback, useMemo } from 'react';

interface CategoryThumbnailProps {
  thumbs: string[];
}

export default function CategoryThumbnail({ thumbs }: CategoryThumbnailProps) {
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());

  const handleError = useCallback((index: number) => {
    setFailedIndexes(prev => new Set([...prev, index]));
  }, []);

  // Get the first 4 thumbnails that haven't failed
  const displayThumbs = useMemo(() => {
    return thumbs
      .map((thumb, i) => ({ thumb, index: i }))
      .filter(({ index }) => !failedIndexes.has(index))
      .slice(0, 4);
  }, [thumbs, failedIndexes]);

  // Don't render anything if less than 1 valid thumbnail
  if (displayThumbs.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-1 mb-3">
      {displayThumbs.map(({ thumb, index }) => (
        <img
          key={index}
          src={thumb}
          alt=""
          className="w-full h-full object-cover rounded aspect-square"
          loading="lazy"
          onError={() => handleError(index)}
        />
      ))}
      {/* If we have less than 4, we need placeholders to maintain grid - but let CSS handle it */}
    </div>
  );
}
