/**
 * Convert object-paths.json.gz to object-paths.db (SQLite) for memory-efficient lookups.
 *
 * Usage:
 *   node scripts/build-object-paths-db.js [input.json.gz] [output.db]
 *
 * Defaults:
 *   input: web/db/object-paths.json.gz
 *   output: web/db/object-paths.db
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

const inputFile = process.argv[2] || path.join(__dirname, '..', 'db', 'object-paths.json.gz');
const outputFile = process.argv[3] || path.join(__dirname, '..', 'db', 'object-paths.db');

if (!fs.existsSync(inputFile)) {
  console.error('Input file not found:', inputFile);
  process.exit(1);
}

console.log('Decompressing', inputFile);
const compressed = fs.readFileSync(inputFile);
const decompressed = zlib.gunzipSync(compressed);

console.log('Parsing JSON');
const objectPaths = JSON.parse(decompressed.toString('utf-8'));
const entries = Object.entries(objectPaths);
console.log('Found', entries.length, 'entries');

console.log('Building SQLite DB at', outputFile);
const dir = path.dirname(outputFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const db = new Database(outputFile);
db.exec('CREATE TABLE object_paths (uid TEXT PRIMARY KEY, path TEXT NOT NULL)');

const insert = db.prepare('INSERT INTO object_paths (uid, path) VALUES (?, ?)');
const insertMany = db.transaction((items) => {
  for (const [uid, filePath] of items) {
    insert.run(uid, filePath);
  }
});

insertMany(entries);

db.exec('CREATE INDEX idx_object_paths_uid ON object_paths(uid)');
db.close();

const size = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(1);
console.log(`Done. ${outputFile} (${size}MB)`);
