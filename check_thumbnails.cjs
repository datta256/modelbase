const Database = require('better-sqlite3');
const db = new Database('backend/objaverse.db');

const assets = db.prepare('SELECT uid, name, thumbnail FROM assets WHERE name LIKE "%Overdensities%" OR name LIKE "%Robotnik%" LIMIT 2').all();
console.log(JSON.stringify(assets, null, 2));

db.close();
