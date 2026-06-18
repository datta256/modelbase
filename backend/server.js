const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const db = new Database("objaverse.db");

const app = express();

app.use(cors());

app.get("/search",(req,res)=>{

    const q = req.query.q || "";

const rows = db.prepare(`
SELECT
    assets.uid,
    assets.name,
    assets.thumbnail,
    assets.tags,

    assets.viewer_url,
    assets.embed_url,

    assets.downloadable,

    assets.face_count,
    assets.vertex_count,
    assets.texture_count,

    assets.category,
    assets.author

FROM assets_fts
JOIN assets
ON assets.uid = assets_fts.uid

WHERE assets_fts MATCH ?

LIMIT 100
`).all(q);

    res.json(rows);

});

app.listen(3000,()=>{
    console.log("Running on 3000");
});