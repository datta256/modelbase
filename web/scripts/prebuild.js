/**
 * Pre-build script: Copy or download SQLite database for deployment
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const destDir = path.join(__dirname, '..', 'db');
const destPath = path.join(destDir, 'objaverse.db');

// 1. Check if DB already exists (e.g., on Render persistent disk)
if (fs.existsSync(destPath)) {
  const mb = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1);
  console.log(`DB already exists: ${mb}MB`);
  process.exit(0);
}

// 2. Try to copy from local source (local dev build)
const sourcePaths = [
  path.join(__dirname, '..', '..', 'backend', 'objaverse.db'),
  path.join(__dirname, '..', 'backend', 'objaverse.db'),
];

for (const sourcePath of sourcePaths) {
  if (fs.existsSync(sourcePath)) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    console.log(`Copying local DB: ${sourcePath}`);
    fs.copyFileSync(sourcePath, destPath);
    console.log('Done.');
    process.exit(0);
  }
}

// 3. Download from GitHub Release (production deployment)
const downloadUrl = process.env.DB_DOWNLOAD_URL;

if (!downloadUrl) {
  console.error('ERROR: DB not found locally and DB_DOWNLOAD_URL not set.');
  console.error('Options:');
  console.error('  1. Set DB_DOWNLOAD_URL env var (GitHub release URL)');
  console.error('  2. Or mount a persistent disk with the DB at:', destPath);
  process.exit(1);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const file = fs.createWriteStream(dest);
    
    https.get(url, { followRedirect: true }, (response) => {
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
        file.close();
        const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
        console.log(`Downloaded: ${mb}MB`);
        resolve();
      });
    }).on('error', reject);
  });
}

console.log('Downloading DB from GitHub Release...');
downloadFile(downloadUrl, destPath)
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Download failed:', err.message);
    process.exit(1);
  });
