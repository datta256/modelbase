const Database = require('better-sqlite3');
const db = new Database('objaverse.db');

console.log('Adding indexes to assets table...');

// Add indexes for frequently queried fields
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_category ON assets(category)');
  console.log('✓ Index on category created');
} catch (e) {
  console.log('✗ Failed to create category index:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_author ON assets(author)');
  console.log('✓ Index on author created');
} catch (e) {
  console.log('✗ Failed to create author index:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_thumbnail ON assets(thumbnail)');
  console.log('✓ Index on thumbnail created');
} catch (e) {
  console.log('✗ Failed to create thumbnail index:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_downloadable ON assets(downloadable)');
  console.log('✓ Index on downloadable created');
} catch (e) {
  console.log('✗ Failed to create downloadable index:', e.message);
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_face_count ON assets(face_count)');
  console.log('✓ Index on face_count created');
} catch (e) {
  console.log('✗ Failed to create face_count index:', e.message);
}

// Composite index for homepage featured assets query (downloadable + thumbnail filter + face_count sort)
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_featured ON assets(downloadable, thumbnail, face_count DESC)');
  console.log('✓ Composite index for featured assets created');
} catch (e) {
  console.log('✗ Failed to create featured index:', e.message);
}

// Index for recent assets (helps with thumbnail NOT NULL filter)
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_recent ON assets(thumbnail)');
  console.log('✓ Index for recent assets created');
} catch (e) {
  console.log('✗ Failed to create recent index:', e.message);
}

console.log('Index creation complete');
db.close();
