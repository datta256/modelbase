import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'ModelBase - Free 3D Models',
    short_name: 'ModelBase',
    description: 'Download 10,000+ free 3D models for Blender, Unity, Unreal Engine',
    start_url: '/',
    display: 'standalone',
    background_color: '#18181b',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
    categories: ['productivity', 'graphics'],
    lang: 'en',
  };

  return NextResponse.json(manifest, {
    headers: {
      'content-type': 'application/manifest+json',
      'cache-control': 'public, max-age=86400',
    },
  });
}
