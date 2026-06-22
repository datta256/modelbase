'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationLoader() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // When route changes complete, finish the bar
  useEffect(() => {
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  // Intercept all internal link clicks and router navigations
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];

    const start = () => {
      timers.forEach(clearTimeout);
      timers = [];
      setVisible(true);
      setProgress(15);
      timers.push(setTimeout(() => setProgress(40), 200));
      timers.push(setTimeout(() => setProgress(65), 600));
      timers.push(setTimeout(() => setProgress(80), 1200));
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
      start();
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-blue-500 pointer-events-none"
      style={{
        width: `${progress}%`,
        opacity: progress >= 100 ? 0 : 1,
        transition: progress >= 100
          ? 'width 0.15s ease-out, opacity 0.35s ease-out 0.1s'
          : 'width 0.5s ease-out',
      }}
    />
  );
}
