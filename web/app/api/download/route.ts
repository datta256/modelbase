import { NextRequest, NextResponse } from 'next/server';
import { db, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Cache for object paths mapping
let objectPathsCache: Map<string, string> | null = null;

async function getObjectPaths(): Promise<Map<string, string>> {
  if (objectPathsCache) return objectPathsCache;
  
  try {
    // Fetch the object-paths.json.gz from Hugging Face
    const response = await fetch(
      'https://huggingface.co/datasets/allenai/objaverse/resolve/main/object-paths.json.gz',
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch object paths');
    }
    
    // Decompress and parse
    const decompressed = await response.arrayBuffer();
    // For now, we'll use a simple heuristic based on known patterns
    // The actual implementation would decompress gzip and parse JSON
    
    objectPathsCache = new Map();
    return objectPathsCache;
  } catch (error) {
    console.error('Error loading object paths:', error);
    return new Map();
  }
}

// Heuristic to determine file path based on UID
// Files are organized in glbs/XXX-XXX/ subdirectories
function getObjectPath(uid: string): string {
  // Remove .glb extension if present
  const cleanUid = uid.endsWith('.glb') ? uid.slice(0, -4) : uid;
  
  // The folder structure is based on the first few characters of the UID
  // Format: glbs/000-001/{uid}.glb, glbs/000-006/{uid}.glb, etc.
  const first3 = cleanUid.slice(0, 3);
  const next3 = cleanUid.slice(3, 6) || '000';
  
  // Build the path - this is an approximation
  // The actual mapping is in object-paths.json.gz
  return `glbs/${first3}-${next3}/${cleanUid}.glb`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  
  if (!uid) {
    return NextResponse.json({ error: 'UID is required' }, { status: 400 });
  }
  
  try {
    // Check if model exists in database and is downloadable
    const asset = await db
      .select({ 
        uid: assets.uid, 
        name: assets.name, 
        downloadable: assets.downloadable 
      })
      .from(assets)
      .where(eq(assets.uid, uid))
      .limit(1);
    
    if (!asset[0]) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    if (!asset[0].downloadable) {
      return NextResponse.json({ 
        error: 'This model is not available for download',
        viewerUrl: `https://sketchfab.com/3d-models/${uid}`
      }, { status: 403 });
    }
    
    // Try to get the actual path from cache or calculate it
    // const objectPaths = await getObjectPaths();
    // const path = objectPaths.get(uid) || getObjectPath(uid);
    
    // For now, use the direct Hugging Face URL with the heuristic path
    const path = getObjectPath(uid);
    const downloadUrl = `https://huggingface.co/datasets/allenai/objaverse/resolve/main/${path}`;
    
    // Verify the URL exists by making a HEAD request
    const headResponse = await fetch(downloadUrl, { method: 'HEAD' });
    
    if (!headResponse.ok) {
      // Try alternative path patterns
      const alternativePaths = [
        `glbs/000-000/${uid}.glb`,
        `glbs/000-001/${uid}.glb`,
        `glbs/000-002/${uid}.glb`,
        `glbs/000-003/${uid}.glb`,
        `glbs/000-004/${uid}.glb`,
        `glbs/000-005/${uid}.glb`,
        `glbs/000-006/${uid}.glb`,
        `glbs/000-007/${uid}.glb`,
        `glbs/000-008/${uid}.glb`,
        `glbs/000-009/${uid}.glb`,
        `glbs/000-010/${uid}.glb`,
        `glbs/000-011/${uid}.glb`,
      ];
      
      for (const altPath of alternativePaths) {
        const altUrl = `https://huggingface.co/datasets/allenai/objaverse/resolve/main/${altPath}`;
        const altHead = await fetch(altUrl, { method: 'HEAD' });
        if (altHead.ok) {
          return NextResponse.json({
            uid: asset[0].uid,
            name: asset[0].name,
            downloadUrl: altUrl,
            filename: `${asset[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${uid}.glb`,
          });
        }
      }
      
      return NextResponse.json({ 
        error: 'Model file not found in Objaverse repository',
        attemptedPath: downloadUrl
      }, { status: 404 });
    }
    
    return NextResponse.json({
      uid: asset[0].uid,
      name: asset[0].name,
      downloadUrl: downloadUrl,
      filename: `${asset[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${uid}.glb`,
    });
    
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}
