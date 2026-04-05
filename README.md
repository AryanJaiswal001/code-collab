# Deployed link (For easy running of the project without local setup):
https://code-collab-dusky-xi.vercel.app/

# Code Collab

Code Collab is a collaborative coding workspace built with Next.js, Auth.js, Prisma, MongoDB, Monaco, WebContainers, and Socket.IO.

It gives teams a shared editor, workspace-based collaboration, GitHub import, file assignment, invite links, chat, voice presence, and a split deployment model for app + realtime.

## What This Project Includes

- Social sign-in with GitHub and Google
- Workspace dashboard with create, rename, delete, and starring flows
- Workspace creation wizard with:
  - template-based setup
  - GitHub repository import
  - collaboration mode selection
  - rules selection
  - invite preparation
- Shared editor experience with Monaco
- File tree, file push, and workspace activity timeline
- Realtime collaboration with Socket.IO
- Member presence and voice session controls
- Invite links and optional email invites
- WebContainer-powered preview and terminal inside the editor

## Tech Stack

- Next.js `16.2.2`
- React `19.2.4`
- TypeScript
- Tailwind CSS `v4`
- Auth.js / `next-auth` `v5 beta`
- Prisma `6.x`
- MongoDB
- Monaco Editor
- Socket.IO
- Nodemailer
- WebContainers

## Project Architecture

This repo has two runtime surfaces:

1. The Next.js app
   - authentication
   - dashboard
   - workspace APIs
   - editor UI
   - invite flows
   - realtime token issuance
2. The standalone realtime server
   - Socket.IO transport
   - realtime room state
   - workspace event fanout
   - presence / voice signaling

For production, the app and realtime server are deployed separately.

## Core Folders

```text
app/
  (auth)/auth/           Auth pages
  api/                   Route handlers
  dashboard/             Dashboard route
  editor/[projectId]/    Main collaborative editor
  home/                  Landing page
  workspace/             Invite + workspace redirects
  modules/               Domain modules (dashboard, github, workspaces, playground)
components/
  ui/                    Shared UI primitives
lib/
  collaboration/         Realtime client + server helpers
  prisma.ts              Prisma client singleton
prisma/
  schema.prisma          MongoDB data model
realtime-server/
  server.mjs             Standalone Socket.IO server
pages/api/
  socket.ts              Local in-process realtime fallback
```

## Requirements

Before setup, make sure you have:

- Node.js `20+`
- npm `10+` recommended
- MongoDB database connection string
- GitHub OAuth app credentials and/or Google OAuth credentials

## How To Clone This Project

```bash
git clone <your-repo-url>
cd code-collab
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Create a `.env` file in the project root.

Use this as a starting point:

```bash
AUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-secret

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

GITHUB_ID=
GITHUB_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false

REALTIME_SERVER_URL=
REALTIME_SHARED_SECRET=
NEXT_PUBLIC_REALTIME_URL=
REALTIME_SOCKET_PATH=/api/socket_io
```

Notes:

- `AUTH_SECRET` is required.
- `AUTH_URL` should match the app origin you are using locally.
- At least one auth provider must be configured if you want to sign in.
- SMTP is optional. If omitted, invite links still work but invite emails are skipped.
- Leave `REALTIME_SERVER_URL` empty for the simplest local setup.

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Push the schema to MongoDB

```bash
npx prisma db push
```

### 5. Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000`

## Local Realtime Modes

### Default local mode

You do not need to run the standalone realtime server locally for normal development.

If `REALTIME_SERVER_URL` is not set, the app falls back to the in-process Socket.IO endpoint in `pages/api/socket.ts`.

### Production-like local mode

If you want to run the standalone realtime server locally:

1. Set:
   - `REALTIME_SERVER_URL=http://localhost:10000`
   - `REALTIME_SHARED_SECRET=<same-secret-used-by-both-services>`
   - `NEXT_PUBLIC_REALTIME_URL=http://localhost:10000` (optional convenience)
2. Start the realtime server:

```bash
npm run realtime:start
```

3. Start the app in another terminal:

```bash
npm run dev
```

## Authentication Setup

### GitHub OAuth

Create a GitHub OAuth app and set:

- Authorization callback URL:
  - `http://localhost:3000/api/auth/callback/github`

### Google OAuth

Create a Google OAuth app and set:

- Authorized redirect URI:
  - `http://localhost:3000/api/auth/callback/google`

You can configure both providers or just one.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run realtime:start
```

Optional database connectivity check:

```bash
node test-db.mjs
```

## Typical Local Workflow

1. Clone the repo
2. Install dependencies
3. Create `.env`
4. Run `npx prisma generate`
5. Run `npx prisma db push`
6. Run `npm run dev`
7. Sign in
8. Create a workspace from a template or GitHub
9. Open the editor and test collaboration features

## Main User Flows

### Create a workspace

From the dashboard, users can:

- create a template-based workspace
- import a GitHub repository
- choose personal or collaboration mode
- choose strict or lenient workspace rules
- prepare invite emails or copy invite links

### Collaborate inside a workspace

Inside the editor, users can:

- browse and edit files
- push file changes to the shared workspace
- view member presence
- use workspace chat
- manage invites and members based on role
- use voice collaboration
- open preview and terminal panels

## Environment Variables

### Required for the Next.js app

- `AUTH_URL`
- `AUTH_SECRET`
- `MONGO_URI`
- `GITHUB_ID` / `GITHUB_SECRET` or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### Optional for the Next.js app

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`
- `REALTIME_SERVER_URL`
- `REALTIME_SHARED_SECRET`
- `NEXT_PUBLIC_REALTIME_URL`

### Required for the standalone realtime server

- `APP_ORIGIN`
- `REALTIME_SHARED_SECRET`

### Optional for the standalone realtime server

- `PORT`
- `REALTIME_SOCKET_PATH`

## Deployment

Production deployment is documented in [`DEPLOYMENT.md`](DEPLOYMENT.md).

At a high level:

- deploy the Next.js app to Vercel
- deploy `realtime-server/server.mjs` as a separate web service on Render
- connect them with `REALTIME_SERVER_URL` and `REALTIME_SHARED_SECRET`

## Stable Finish-State Notes

This repository currently stays on the existing pinned app versions and dependency ranges. No version upgrades are required for the setup documented here.

The final polish in this repo was kept intentionally low-risk:

- project README rewritten for real setup and deployment
- legal pages added for auth flows
- custom auth error page added
- no package upgrades introduced

## Troubleshooting

### Sign-in keeps failing

Check:

- `AUTH_URL`
- `AUTH_SECRET`
- OAuth callback URLs
- provider credentials

### Dashboard or editor redirects unexpectedly

Make sure you are signed in and the workspace exists in MongoDB.

### Invite emails are not sent

That is expected when SMTP env vars are not configured. Invite links can still be created and copied.

### Production build fails while fetching fonts

This project uses `next/font/google`. Building in an offline environment can fail when Google Fonts cannot be fetched.

### Realtime does not connect

Check:

- `REALTIME_SERVER_URL`
- `REALTIME_SHARED_SECRET`
- `APP_ORIGIN`
- Render health endpoint

## Final Notes

If you are onboarding a teammate, the simplest path is:

```bash
git clone <your-repo-url>
cd code-collab
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Then configure auth, sign in, and create the first workspace from the dashboard.
