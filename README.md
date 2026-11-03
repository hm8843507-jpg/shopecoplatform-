# Shop.co storefront

## Deploy the frontend to Vercel

Set Vercel's **Root Directory** to `.` when this folder is the connected
repository root. Confirm Vercel's Build and Development Settings use the Vite
preset, `npm run build`, and `dist`. The Vercel configuration in this directory
installs with `npm ci` and rewrites client-side routes such as `/shop` and
`/product/:id` to the app entry point. API requests use the full backend URL,
and static files are served from the build output.

In the frontend Vercel project's Environment Variables, set:

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_API_URL` | `https://shop-co-backend-g1hg.vercel.app` | Production and Preview |

Use a plain URL (not Markdown link syntax); the frontend accepts it with or
without a trailing `/api`. Vite embeds this value at build time, so redeploy
after changing it. For local development, `.env.development` points to
`http://localhost:5000`.

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
