/**
 * Upload SQLite DB to GitHub Release for automatic deployment download
 * Usage: node scripts/upload-db-release.js GITHUB_TOKEN
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DB_PATH = path.join(__dirname, '..', 'backend', 'objaverse.db');
const REPO = 'datta256/modelbase';
const TAG = 'db-v1';

async function githubRequest(path, method = 'GET', data = null, headers = {}) {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node upload-db-release.js YOUR_GITHUB_TOKEN');
    console.error('Get token at: https://github.com/settings/tokens (needs "repo" scope)');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'ModelBase-Deploy',
        'Accept': 'application/vnd.github.v3+json',
        ...headers,
      },
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function uploadAsset(uploadUrl, filePath) {
  const token = process.argv[2];
  const data = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Replace {?name,label} with actual query params
  const url = uploadUrl.replace('{?name,label}', `?name=${fileName}`);

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length,
        'User-Agent': 'ModelBase-Deploy',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB not found: ${DB_PATH}`);
    process.exit(1);
  }

  const stats = fs.statSync(DB_PATH);
  const mb = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${mb}MB DB to GitHub Release...`);

  // 1. Create or get release
  let release;
  try {
    release = await githubRequest(`/repos/${REPO}/releases/tags/${TAG}`);
    if (release.message === 'Not Found') throw new Error('not found');
    console.log('Release exists, uploading asset...');
  } catch {
    console.log('Creating new release...');
    release = await githubRequest(`/repos/${REPO}/releases`, 'POST', JSON.stringify({
      tag_name: TAG,
      name: 'Database Release',
      body: 'SQLite database for deployment',
      draft: false,
      prerelease: false,
    }), { 'Content-Type': 'application/json' });
  }

  // 2. Check if asset already exists
  const existingAsset = release.assets?.find(a => a.name === 'objaverse.db');
  if (existingAsset) {
    console.log('Asset exists, deleting old version...');
    await githubRequest(`/repos/${REPO}/releases/assets/${existingAsset.id}`, 'DELETE');
  }

  // 3. Upload asset
  console.log('Uploading asset (this may take a few minutes)...');
  const result = await uploadAsset(release.upload_url, DB_PATH);

  if (result.browser_download_url) {
    console.log('\n✅ Upload complete!');
    console.log('Download URL:', result.browser_download_url);
    console.log('\nAdd this to your Render environment variable:');
    console.log(`DB_DOWNLOAD_URL=${result.browser_download_url}`);
  } else {
    console.error('Upload failed:', result);
    process.exit(1);
  }
}

main().catch(console.error);
