const Database = require('better-sqlite3');
const db = new Database('objaverse.db');

// Check distinct category names
const categories = db.prepare("SELECT DISTINCT category FROM assets WHERE category IS NOT NULL LIMIT 20").all();
console.log('Sample categories:', JSON.stringify(categories, null, 2));

// Check specific category
const artAbstract = db.prepare("SELECT COUNT(*) as count FROM assets WHERE category LIKE '%art%' OR category LIKE '%abstract%'").all();
console.log('Art/Abstract count:', JSON.stringify(artAbstract, null, 2));

db.close();
