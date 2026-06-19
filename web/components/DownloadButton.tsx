'use client';

import { useRef, useState } from 'react';

interface DownloadData {
  downloadUrl: string;
  filename: string;
  viewerUrl?: string;
}

interface DownloadButtonProps {
  uid: string;
  name: string;
  downloadable: boolean;
}

export default function DownloadButton({ uid, name, downloadable }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadData = useRef<DownloadData | null>(null);
  const prefetching = useRef(false);

  const fetchDownloadData = async (): Promise<DownloadData | null> => {
    if (downloadData.current) return downloadData.current;
    if (prefetching.current) return null;
    prefetching.current = true;

    try {
      const response = await fetch(`/api/download?uid=${encodeURIComponent(uid)}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.viewerUrl) {
          return { downloadUrl: data.viewerUrl, filename: '', viewerUrl: data.viewerUrl };
        }
        throw new Error(data.error || 'Failed to get download URL');
      }

      downloadData.current = {
        downloadUrl: data.downloadUrl,
        filename: data.filename,
      };
      return downloadData.current;
    } finally {
      prefetching.current = false;
    }
  };

  const triggerDownload = (data: DownloadData) => {
    if (data.viewerUrl) {
      window.open(data.viewerUrl, '_blank');
      return;
    }

    const link = document.createElement('a');
    link.href = data.downloadUrl;
    link.download = data.filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async () => {
    if (!downloadable) return;

    setIsDownloading(true);
    setError(null);

    try {
      const data = await fetchDownloadData();
      if (!data) return;
      triggerDownload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download. Please try again.');
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMouseEnter = () => {
    if (!downloadable || downloadData.current || prefetching.current) return;
    fetchDownloadData().catch(console.error);
  };

  if (!downloadable) {
    return (
      <button
        disabled
        className="px-6 py-3.5 bg-zinc-800/60 text-zinc-500 font-semibold rounded-xl cursor-not-allowed border border-zinc-700/50 flex items-center gap-2"
        title="This model is not available for download"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Not Available
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        onMouseEnter={handleMouseEnter}
        disabled={isDownloading}
        className="px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:from-green-800 disabled:to-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
      >
        {isDownloading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Downloading...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .GLB
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>
      )}
    </div>
  );
}
