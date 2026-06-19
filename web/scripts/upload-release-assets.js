/**
 * Upload db assets to a GitHub Release.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node scripts/upload-release-assets.js [tag]
 *
 * Defaults to tag "db-v1".
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('ERROR: GITHUB_TOKEN env var is required');
  process.exit(1);
}

const tag = process.argv[2] || 'db-v1';

const repoUrl = 'https://github.com/datta256/modelbase.git';
const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
if (!match) {
  console.error('ERROR: Could not parse repo from', repoUrl);
  process.exit(1);
}
const [owner, repo] = [match[1], match[2]];

const assetsDir = path.join(__dirname, '..', 'db');
const files = ['objaverse.db', 'object-paths.json.gz', 'object-paths.db'];

function apiRequest(method, hostname, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname,
      path,
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'modelbase-upload-script',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } else {
          reject(new Error(`GitHub API ${method} ${path} failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getReleaseId() {
  const result = await apiRequest(
    'GET',
    'api.github.com',
    `/repos/${owner}/${repo}/releases/tags/${tag}`
  );
  return result.data.id;
}

async function deleteExistingAsset(releaseId, filename) {
  // List assets and delete any with the same name
  const release = await apiRequest(
    'GET',
    'api.github.com',
    `/repos/${owner}/${repo}/releases/${releaseId}`
  );
  const assets = release.data.assets || [];
  const existing = assets.find((a) => a.name === filename);
  if (existing) {
    console.log(`Deleting existing asset: ${filename} (${existing.id})`);
    await apiRequest(
      'DELETE',
      'api.github.com',
      `/repos/${owner}/${repo}/releases/assets/${existing.id}`
    );
  }
}

async function uploadAsset(releaseId, filepath) {
  const filename = path.basename(filepath);
  const size = fs.statSync(filepath).size;
  const body = fs.readFileSync(filepath);

  await deleteExistingAsset(releaseId, filename);

  console.log(`Uploading ${filename} (${(size / 1024 / 1024).toFixed(1)}MB)...`);

  const result = await apiRequest(
    'POST',
    'uploads.github.com',
    `/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`,
    {
      'Content-Type': 'application/octet-stream',
      'Content-Length': size,
    },
    body
  );

  console.log(`Uploaded: ${result.data.browser_download_url}`);
}

async function main() {
  console.log(`Uploading assets to release ${tag}...`);
  const releaseId = await getReleaseId();

  // Generate the SQLite object-paths DB if needed
  const dbPath = path.join(assetsDir, 'object-paths.db');
  if (!fs.existsSync(dbPath)) {
    const jsonPath = path.join(assetsDir, 'object-paths.json.gz');
    if (fs.existsSync(jsonPath)) {
      console.log('Generating object-paths.db from object-paths.json.gz...');
      execSync(`node "${path.join(__dirname, 'build-object-paths-db.js')}" "${jsonPath}" "${dbPath}"`, {
        stdio: 'inherit',
      });
    }
  }

  for (const filename of files) {
    const filepath = path.join(assetsDir, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`Skipping missing file: ${filepath}`);
      continue;
    }
    await uploadAsset(releaseId, filepath);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
