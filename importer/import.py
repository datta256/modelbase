import sqlite3
import ijson
from tqdm import tqdm

DB_PATH = "../backend/objaverse.db"
JSON_PATH = "../annotations.json"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS assets")
cur.execute("DROP TABLE IF EXISTS assets_fts")

cur.execute("""
CREATE TABLE assets(
    uid TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    tags TEXT,
    thumbnail TEXT,
    uri TEXT,
    viewer_url TEXT,
    embed_url TEXT,
    downloadable INTEGER,
    face_count INTEGER,
    vertex_count INTEGER,
    texture_count INTEGER,
    category TEXT,
    author TEXT
)
""")

cur.execute("""
CREATE VIRTUAL TABLE assets_fts
USING fts5(
    uid,
    name,
    description,
    tags
)
""")

conn.commit()

BATCH_SIZE = 1000

batch_assets = []
batch_fts = []

print("Importing annotations...")

with open(JSON_PATH, "rb") as f:

    objects = ijson.kvitems(f, "")

    for uid, obj in tqdm(objects):

        name = obj.get("name", "")
        description = obj.get("description", "")

        tags = []

        for tag in obj.get("tags", []):

            if isinstance(tag, dict):
                tags.append(tag.get("name", ""))
            else:
                tags.append(str(tag))

        tags_text = " ".join(tags)

        thumbnail = ""

        try:
            images = obj["thumbnails"]["images"]

            if images:

                best = max(
                    images,
                    key=lambda x:
                        x.get("width", 0)
                        *
                        x.get("height", 0)
                )

                thumbnail = best["url"]

        except Exception:
            pass

        uri = obj.get("uri", "")
        viewer_url = obj.get("viewerUrl", "")
        embed_url = obj.get("embedUrl", "")

        downloadable = (
            1
            if obj.get("isDownloadable", False)
            else 0
        )

        face_count = obj.get("faceCount", 0)
        vertex_count = obj.get("vertexCount", 0)
        texture_count = obj.get("textureCount", 0)

        category = ""

        try:
            categories = obj.get("categories", [])

            if categories:
                category = categories[0].get("name", "")

        except Exception:
            pass

        author = ""

        try:
            author = obj.get("user", {}).get(
                "username",
                ""
            )

        except Exception:
            pass

        batch_assets.append(
            (
                uid,
                name,
                description,
                tags_text,
                thumbnail,
                uri,
                viewer_url,
                embed_url,
                downloadable,
                face_count,
                vertex_count,
                texture_count,
                category,
                author
            )
        )

        batch_fts.append(
            (
                uid,
                name,
                description,
                tags_text
            )
        )

        if len(batch_assets) >= BATCH_SIZE:

            cur.executemany("""
            INSERT INTO assets VALUES(
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?
            )
            """, batch_assets)

            cur.executemany("""
            INSERT INTO assets_fts VALUES(
                ?, ?, ?, ?
            )
            """, batch_fts)

            conn.commit()

            batch_assets.clear()
            batch_fts.clear()

if batch_assets:

    cur.executemany("""
    INSERT INTO assets VALUES(
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?
    )
    """, batch_assets)

    cur.executemany("""
    INSERT INTO assets_fts VALUES(
        ?, ?, ?, ?
    )
    """, batch_fts)

    conn.commit()

conn.close()

print("DONE")