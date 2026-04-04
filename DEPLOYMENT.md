# Deployment

This repo is now split into two runtime surfaces:

- `Vercel`: Next.js app, Auth.js, Prisma, Mongo-backed workspace APIs
- `Render`: standalone Socket.IO realtime server in `realtime-server/server.mjs`

## Architecture

- The browser asks Vercel for a short-lived realtime token at `GET /api/realtime/token`.
- Vercel signs that token with `REALTIME_SHARED_SECRET`.
- The browser connects to Render using that token over Socket.IO.
- Render validates workspace membership and persists realtime-side chat/activity by calling Vercel's internal route:
  `POST /api/internal/realtime/workspaces/[workspaceId]`
- Vercel publishes outbound workspace events to Render through:
  `POST <REALTIME_SERVER_URL>/internal/events`

## Environment Variables

### Vercel

- `AUTH_URL`
- `AUTH_SECRET`
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`
- `REALTIME_SERVER_URL`
- `REALTIME_SHARED_SECRET`

Recommended values:

- `AUTH_URL=https://app.your-domain.com`
- `REALTIME_SERVER_URL=https://realtime.your-domain.com`

### Render

- `APP_ORIGIN`
- `REALTIME_SHARED_SECRET`
- `PORT`

Recommended values:

- `APP_ORIGIN=https://app.your-domain.com`
- `PORT=10000`

## Vercel Setup

1. Create a Vercel project pointing at this repo.
2. Set the production environment variables listed above.
3. Add your production OAuth callback URLs:
   - `https://app.your-domain.com/api/auth/callback/google`
   - `https://app.your-domain.com/api/auth/callback/github`
4. Deploy the app.

## Render Setup

1. Create a new `Web Service` on Render from this same repo.
2. Use the repo root as the service root, not `realtime-server`.
3. Set:
   - Build Command: `npm install`
   
4. Add the Render environment variables listed above.
5. Deploy the service.
6. Confirm `GET /health` returns `{ "ok": true }`.

You can also use the included [render.yaml](/c:/Projects/code-collab/render.yaml) as a blueprint starter. If you already created the service, open Render settings and change the Root Directory back to the repo root or clear it entirely.

## Rollout Order

1. Deploy Render first and confirm `/health`.
2. Put the Render URL into Vercel as `REALTIME_SERVER_URL`.
3. Redeploy Vercel.
4. Open a workspace and confirm:
   - presence updates appear
   - chat works
   - file push notifications arrive
   - member role/remove events refresh other clients
   - voice join/leave and signaling still work

## Local Development

If `REALTIME_SERVER_URL` is not set, the app falls back to the existing in-process realtime server through `pages/api/socket.ts`.

That means local development still works without Render.

## Scaling Note

The Render service currently stores room state in memory. Run a single instance first.

If you later scale horizontally, add Redis and the Socket.IO Redis adapter before increasing the Render instance count.
