/**
 * Pre-build script: Copy SQLite database into the web directory
 * This ensures the DB is included in the Render deployment artifact
 */
const fs = require('fs');
const path = require('path');

const sourcePaths = [
  path.join(__dirname, '..', '..', 'backend', 'objaverse.db'),
  path.join(__dirname, '..', 'backend', 'objaverse.db'),
];

const destDir = path.join(__dirname, '..', 'db');
const destPath = path.join(destDir, 'objaverse.db');

// Find the source DB
let sourcePath = null;
for (const p of sourcePaths) {
  if (fs.existsSync(p)) {
    sourcePath = p;
    break;
  }
}

if (!sourcePath) {
  console.error('ERROR: objaverse.db not found in any of:');
  sourcePaths.forEach(p => console.error('  ' + p));
  process.exit(1);
}

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy DB (only if missing or source is newer)
const sourceStat = fs.statSync(sourcePath);
let needsCopy = true;
if (fs.existsSync(destPath)) {
  const destStat = fs.statSync(destPath);
  needsCopy = sourceStat.mtime > destStat.mtime;
}

if (needsCopy) {
  console.log(`Copying DB: ${sourcePath} -> ${destPath}`);
  fs.copyFileSync(sourcePath, destPath);
  console.log('Done.');
} else {
  console.log('DB is already up to date.');
}
