import { NextRequest, NextResponse } from 'next/server';
import { db, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// Cache for object paths mapping (JSON fallback only)
let objectPathsCache: Map<string, string> | null = null;

const OBJECT_PATHS_DB_CANDIDATES = [
  path.join(process.cwd(), 'db', 'object-paths.db'),
  path.join(process.cwd(), 'web', 'db', 'object-paths.db'),
  path.join(process.cwd(), '..', 'db', 'object-paths.db'),
  path.join(process.cwd(), '..', '..', 'db', 'object-paths.db'),
].filter(Boolean);

const OBJECT_PATHS_JSON_CANDIDATES = [
  path.join(process.cwd(), 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), 'web', 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), '..', 'db', 'object-paths.json.gz'),
  path.join(process.cwd(), '..', '..', 'db', 'object-paths.json.gz'),
].filter(Boolean);

function findFirstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadObjectPathsFromJson(): Map<string, string> | null {
  const filePath = findFirstExisting(OBJECT_PATHS_JSON_CANDIDATES);
  if (!filePath) {
    console.log('Object paths JSON not found. Searched:', OBJECT_PATHS_JSON_CANDIDATES);
    return null;
  }
  try {
    console.log('Loading object paths from', filePath);
    const compressed = fs.readFileSync(filePath);
    const decompressed = zlib.gunzipSync(compressed);
    const objectPaths = JSON.parse(decompressed.toString('utf-8')) as Record<string, string>;
    const map = new Map(Object.entries(objectPaths));
    console.log(`Loaded ${map.size} object paths into memory`);
    return map;
  } catch (error) {
    console.error('Error loading object paths from JSON:', error);
    return null;
  }
}

function getObjectPathFromDb(uid: string): string | null {
  const filePath = findFirstExisting(OBJECT_PATHS_DB_CANDIDATES);
  if (!filePath) return null;
  try {
    const objectPathsDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const row = objectPathsDb.prepare('SELECT path FROM object_paths WHERE uid = ?').get(uid) as { path: string } | undefined;
    objectPathsDb.close();
    return row?.path || null;
  } catch (error) {
    console.error('Error querying object paths DB:', error);
    return null;
  }
}

async function getObjectPath(uid: string): Promise<string | null> {
  // Prefer SQLite DB (memory efficient)
  const dbPath = getObjectPathFromDb(uid);
  if (dbPath) return dbPath;

  // Fall back to in-memory JSON Map
  if (!objectPathsCache) {
    objectPathsCache = loadObjectPathsFromJson();
  }
  return objectPathsCache?.get(uid) || null;
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
function getHeuristicObjectPath(uid: string): string {
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
    
    // Try to get the actual path from the DB/cache
    const exactPath = await getObjectPath(uid);
    const filename = `${asset[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${uid}.glb`;
    const HF_BASE = 'https://huggingface.co/datasets/allenai/objaverse/resolve/main';

    if (exactPath) {
      // Exact path from DB — trust it, no HEAD check needed
      return NextResponse.json({
        uid: asset[0].uid,
        name: asset[0].name,
        downloadUrl: `${HF_BASE}/${exactPath}`,
        filename,
      });
    }

    // No exact path — fall back to heuristic and verify with HEAD
    const heuristicPath = getHeuristicObjectPath(uid);
    const heuristicUrl = `${HF_BASE}/${heuristicPath}`;

    if (await verifyUrl(heuristicUrl)) {
      return NextResponse.json({
        uid: asset[0].uid,
        name: asset[0].name,
        downloadUrl: heuristicUrl,
        filename,
      });
    }

    return NextResponse.json({
      error: 'Model file not found in Objaverse repository',
      attemptedPath: heuristicUrl,
    }, { status: 404 });
    
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}
