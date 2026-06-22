'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationLoader() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLoading(false);
    setProgress(100);
    const t = setTimeout(() => setProgress(0), 400);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  const startLoading = useCallback(() => {
    setLoading(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(50), 200);
    const t2 = setTimeout(() => setProgress(75), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const anchors = document.querySelectorAll('a[href]');
    const handleClick = (e: Event) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
      startLoading();
    };

    anchors.forEach(a => a.addEventListener('click', handleClick));
    return () => anchors.forEach(a => a.removeEventListener('click', handleClick));
  }, [pathname, startLoading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-blue-500 transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        transition: progress === 100
          ? 'width 0.1s ease-out, opacity 0.4s ease-out 0.1s'
          : 'width 0.4s ease-out',
      }}
    />
  );
}
