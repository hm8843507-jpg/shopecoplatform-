# Shop.co storefront

## Deploy the frontend to Vercel

Set Vercel's **Root Directory** to the directory containing this file and
`package.json` (`project` if the connected repository is `New folder (3)`, or
`.` if the repository itself is this folder). Confirm Vercel's Build and
Development Settings use the Vite preset, `npm run build`, and `dist`. The
Vercel configuration in this directory installs with `npm ci` and rewrites
client-side routes such as `/shop` and `/product/:id` to `/index.html`.

In the frontend Vercel project's Environment Variables, set:

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_API_URL` | `https://shop-co-backend-g1hg.vercel.app/api` | Production and Preview |

Vite embeds this value at build time, so redeploy after changing it. For local
development, `.env.development` points to `http://localhost:5000/api`.

## Backend and database

The backend is deployed separately at
`https://shop-co-backend-g1hg.vercel.app`. Its Vercel project must have a
reachable MongoDB URI (`MONGO_URI` or `MONGODB_URI`) and a unique
`JWT_SECRET` of at least 32 characters. Do not put backend secrets in this
frontend project or in `VITE_*` variables.

Add the deployed storefront's exact origin (scheme and hostname, without a
path) to `CORS_ORIGINS` in the backend Vercel project. Include each Preview
origin that needs API access, comma-separated, then redeploy the backend.

## Local checks

Run `npm ci`, `npm run typecheck`, and `npm run build` from this directory.
