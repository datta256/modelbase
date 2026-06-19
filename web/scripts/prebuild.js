/**
 * Pre-build script: Copy or download SQLite database for deployment
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const destDir = path.join(__dirname, '..', 'db');
const dbPath = path.join(destDir, 'objaverse.db');
const objectPathsUrl =
  process.env.OBJECT_PATHS_DOWNLOAD_URL ||
  'https://huggingface.co/datasets/allenai/objaverse/resolve/main/object-paths.json.gz';
const objectPathsPath = path.join(destDir, 'object-paths.json.gz');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const file = fs.createWriteStream(dest);
    const timeout = setTimeout(() => {
      file.destroy();
      reject(new Error('Download timeout'));
    }, 300000); // 5 minutes

    https.get(url, { followRedirect: true, timeout: 300000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const total = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total && downloaded % (10 * 1024 * 1024) === 0) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          console.log(`Downloading... ${pct}%`);
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        clearTimeout(timeout);
        file.close();
        const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
        console.log(`Downloaded: ${mb}MB`);
        resolve();
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  // 1. Database
  if (fs.existsSync(dbPath)) {
    const mb = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(1);
    console.log(`DB already exists: ${mb}MB`);
  } else {
    // Try to copy from local source (local dev build)
    const sourcePaths = [
      path.join(__dirname, '..', '..', 'backend', 'objaverse.db'),
      path.join(__dirname, '..', 'backend', 'objaverse.db'),
    ];

    let copied = false;
    for (const sourcePath of sourcePaths) {
      if (fs.existsSync(sourcePath)) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        console.log(`Copying local DB: ${sourcePath}`);
        fs.copyFileSync(sourcePath, dbPath);
        copied = true;
        break;
      }
    }

    if (!copied) {
      const downloadUrl = process.env.DB_DOWNLOAD_URL;
      if (!downloadUrl) {
        console.error('ERROR: DB not found locally and DB_DOWNLOAD_URL not set.');
        console.error('Options:');
        console.error('  1. Set DB_DOWNLOAD_URL env var (GitHub release URL)');
        console.error('  2. Or mount a persistent disk with the DB at:', dbPath);
        process.exit(1);
      }
      console.log('Downloading DB from GitHub Release...');
      await downloadFile(downloadUrl, dbPath);
    }
  }

  // 2. Object paths mapping
  const objectPathsDbPath = path.join(destDir, 'object-paths.db');
  const objectPathsJsonPath = path.join(destDir, 'object-paths.json.gz');
  const isDbUrl = objectPathsUrl.endsWith('.db');
  const isJsonUrl = objectPathsUrl.endsWith('.json.gz');

  if (fs.existsSync(objectPathsDbPath)) {
    const mb = (fs.statSync(objectPathsDbPath).size / 1024 / 1024).toFixed(1);
    console.log(`Object paths DB already exists: ${mb}MB`);
  } else if (isDbUrl) {
    console.log('Downloading object paths DB...');
    await downloadFile(objectPathsUrl, objectPathsDbPath);
  } else {
    // Download .json.gz (or fallback) and convert to .db
    if (!fs.existsSync(objectPathsJsonPath)) {
      console.log('Downloading object paths JSON...');
      await downloadFile(objectPathsUrl, objectPathsJsonPath);
    } else {
      const mb = (fs.statSync(objectPathsJsonPath).size / 1024 / 1024).toFixed(1);
      console.log(`Object paths JSON already exists: ${mb}MB`);
    }

    console.log('Converting object paths JSON to SQLite DB...');
    try {
      execSync(
        `node "${path.join(__dirname, 'build-object-paths-db.js')}" "${objectPathsJsonPath}" "${objectPathsDbPath}"`,
        { stdio: 'inherit' }
      );
    } catch (err) {
      console.error('Failed to convert object paths to SQLite DB. The API may run out of memory when loading JSON.', err);
      // Don't exit — the API can still fall back to JSON if needed
    }
  }

  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Prebuild failed:', err.message);
    process.exit(1);
  });
