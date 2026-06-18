import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { assets } from '@/drizzle/schema';
import path from 'path';
import fs from 'fs';

const possiblePaths = [
  process.env.DATABASE_PATH,
  path.join(process.cwd(), 'db', 'objaverse.db'),
  path.join(process.cwd(), 'backend', 'objaverse.db'),
  path.join(process.cwd(), '../backend/objaverse.db'),
  path.join(process.cwd(), '../../backend/objaverse.db'),
].filter(Boolean) as string[];

let dbPath: string | null = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  throw new Error(`objaverse.db not found. Searched:\n${possiblePaths.map(p => '  - ' + p).join('\n')}`);
}

const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
const db = drizzle(sqlite);

export { db, assets };
