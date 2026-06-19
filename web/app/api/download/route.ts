import { NextRequest, NextResponse } from 'next/server';
import { db, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

// Cache for object paths mapping
let objectPathsCache: Map<string, string> | null = null;

const OBJECT_PATHS_URL =
  process.env.OBJECT_PATHS_DOWNLOAD_URL ||
  'https://huggingface.co/datasets/allenai/objaverse/resolve/main/object-paths.json.gz';

const OBJECT_PATHS_CANDIDATES = [
  path.join(process.cwd(), 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), 'web', 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), '..', 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), '..', '..', 'db', 'object-paths.json.gz'),
].filter(Boolean);

function findObjectPathsFile(): string | null {
  for (const candidate of OBJECT_PATHS_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadObjectPathsFromDisk(): Map<string, string> | null {
  const filePath = findObjectPathsFile();
  if (!filePath) {
    console.log('Object paths file not found. Searched:', OBJECT_PATHS_CANDIDATES);
    return null;
  }
  try {
    console.log('Loading object paths from', filePath);
    const compressed = fs.readFileSync(filePath);
    const decompressed = zlib.gunzipSync(compressed);
    const objectPaths = JSON.parse(decompressed.toString('utf-8')) as Record<string, string>;
    const map = new Map(Object.entries(objectPaths));
    console.log(`Loaded ${map.size} object paths`);
    return map;
  } catch (error) {
    console.error('Error loading object paths from disk:', error);
    return null;
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(dest);
    const timeout = setTimeout(() => {
      file.destroy();
      reject(new Error('Download timeout'));
    }, 300000); // 5 minutes

    https.get(url, { timeout: 300000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        clearTimeout(timeout);
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function getObjectPaths(): Promise<Map<string, string>> {
  if (objectPathsCache) return objectPathsCache;

  // Try loading from local disk cache first
  const diskCache = loadObjectPathsFromDisk();
  if (diskCache) {
    objectPathsCache = diskCache;
    return objectPathsCache;
  }

  // Don't try to download during a request in production; fallback to heuristic
  if (process.env.NODE_ENV === 'production') {
    console.log('Object paths not available in production; using heuristic fallback');
    return new Map();
  }

  try {
    const cacheFile = OBJECT_PATHS_CANDIDATES[0];
    console.log('Downloading object paths from', OBJECT_PATHS_URL);
    await downloadFile(OBJECT_PATHS_URL, cacheFile);
    console.log('Object paths saved to', cacheFile);

    const downloadedCache = loadObjectPathsFromDisk();
    if (downloadedCache) {
      objectPathsCache = downloadedCache;
      return objectPathsCache;
    }
  } catch (error) {
    console.error('Error downloading object paths:', error);
  }

  return new Map();
}

// Lightweight HEAD check with a short timeout
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    console.log('HEAD check failed for', url, error);
    return false;
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
    const objectPaths = await getObjectPaths();
    const exactPath = objectPaths.get(uid);
    const heuristicPath = getObjectPath(uid);
    
    // Build the direct Hugging Face URL with the exact path if available, otherwise heuristic
    const path = exactPath || heuristicPath;
    const downloadUrl = `https://huggingface.co/datasets/allenai/objaverse/resolve/main/${path}`;
    
    // Verify the URL exists by making a HEAD request (with a short timeout)
    const isVerified = await verifyUrl(downloadUrl);
    
    if (!isVerified) {
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
        if (await verifyUrl(altUrl)) {
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
