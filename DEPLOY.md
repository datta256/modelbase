# Deploy to Render

## Prerequisites

1. Push this repo to GitHub (make sure `backend/objaverse.db` is committed or available)
2. Create a Render account at https://render.com

## Steps

### 1. Connect Repo
- Go to https://dashboard.render.com/blueprints
- Click "New Blueprint Instance"
- Connect your GitHub repo
- Render will auto-detect `render.yaml`

### 2. Environment Variables (optional)
The blueprint sets defaults. Change these in Render dashboard after deploy:
- `NEXT_PUBLIC_SITE_URL`: Your custom domain (e.g., `https://modelbase.io`)

### 3. Deploy
- Render will run: `cd web && npm install && npm run build`
- The `prebuild` script copies `backend/objaverse.db` → `web/db/objaverse.db`
- Build completes (~5-10 minutes for 2,410 category pages)
- Your site goes live!

## Pricing

| Plan | Cost | Good For |
|------|------|----------|
| Starter | $7/month | Prototype, < 50k visits |
| Standard | $25/month | 100k+ visits, faster builds |

## Database

- SQLite file is copied during build and stored on disk
- The `disk` in `render.yaml` ensures persistence across deploys
- File size: ~1GB (ensure your Render plan has enough disk)

## Custom Domain

1. Buy domain (Cloudflare, Namecheap, etc.)
2. In Render dashboard: Settings → Custom Domains → Add domain
3. Add DNS records as instructed by Render
4. Update `NEXT_PUBLIC_SITE_URL` env var
5. Redeploy
