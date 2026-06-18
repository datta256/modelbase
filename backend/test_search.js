const Database = require('better-sqlite3');
const db = new Database('objaverse.db');

// Check for FTS table
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Try the search query from the server
const q = 'spaceships furniture vehicles characters';
try {
  const result = db.prepare('SELECT * FROM assets_fts WHERE assets_fts MATCH ? LIMIT 5').all(q);
  console.log('FTS search result:', result.length, 'rows');
} catch (err) {
  console.log('FTS error:', err.message);
  
  // Try without FTS
  const result2 = db.prepare('SELECT * FROM assets WHERE name LIKE ? OR tags LIKE ? LIMIT 5').all(`%${q}%`, `%${q}%`);
  console.log('Simple search result:', result2.length, 'rows');
}
