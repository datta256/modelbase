const Database = require('better-sqlite3');
const db = new Database('../backend/objaverse.db');

// Check schema
const schema = db.prepare("PRAGMA table_info(assets)").all();
console.log('Columns:', schema.map(c => c.name).join(', '));

// Sample model
const row = db.prepare("SELECT * FROM assets WHERE thumbnail != '' AND description IS NOT NULL LIMIT 1").get();
console.log('\nSample model:');
console.log('  uid:', row?.uid);
console.log('  name:', row?.name);
console.log('  description:', row?.description?.substring(0, 200));
console.log('  tags:', row?.tags);
console.log('  category:', row?.category);
console.log('  author:', row?.author);

// Count with descriptions
const descCount = db.prepare("SELECT COUNT(*) as count FROM assets WHERE description IS NOT NULL AND description != ''").get();
console.log('\nModels with descriptions:', descCount.count);

// Count with tags
const tagCount = db.prepare("SELECT COUNT(*) as count FROM assets WHERE tags IS NOT NULL AND tags != ''").get();
console.log('Models with tags:', tagCount.count);

// Count total
const total = db.prepare('SELECT COUNT(*) as count FROM assets').get();
console.log('Total models:', total.count);

// Average description length
const avgDesc = db.prepare("SELECT AVG(LENGTH(description)) as avg FROM assets WHERE description IS NOT NULL AND description != ''").get();
console.log('Avg description length:', Math.round(avgDesc.avg), 'chars');

// Sample categories with counts
const cats = db.prepare('SELECT category, COUNT(*) as count FROM assets WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10').all();
console.log('\nTop categories:');
cats.forEach(c => console.log('  ', c.category, ':', c.count));
