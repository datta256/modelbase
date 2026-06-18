const Database = require('better-sqlite3');
const db = new Database('../backend/objaverse.db', { readonly: true });

// Count models with categories
const totalWithCat = db.prepare("SELECT COUNT(*) as c FROM assets WHERE category IS NOT NULL AND category != ''").get();
console.log('Models with category:', totalWithCat.c);

const total = db.prepare("SELECT COUNT(*) as c FROM assets").get();
console.log('Total models:', total.c);

// Top categories
const cats = db.prepare("SELECT category, COUNT(*) as c FROM assets WHERE category IS NOT NULL AND category != '' GROUP BY category ORDER BY c DESC LIMIT 20").all();
console.log('\nTop 20 categories:');
cats.forEach(c => console.log('  ', c.category, ':', c.c));

// How many unique categories total?
const uniqueCats = db.prepare("SELECT COUNT(DISTINCT category) as c FROM assets WHERE category IS NOT NULL AND category != ''").get();
console.log('\nUnique categories:', uniqueCats.c);

// Count blank/null categories
const blank = db.prepare("SELECT COUNT(*) as c FROM assets WHERE category IS NULL OR category = ''").get();
console.log('Blank/NULL categories:', blank.c);

db.close();
