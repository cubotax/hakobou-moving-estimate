# Moving Estimate Application

## Overview
A Japanese moving estimate form application (引越し見積もりフォーム) that helps users calculate moving costs in 3 simple steps: address input, conditions selection, and estimate results. Includes LINE integration for follow-up messaging.

## Project Structure
- `client/` - React frontend with Vite
- `server/` - Express.js production server
- `shared/` - Shared types and utilities
- `line-backend/` - LINE Messaging API backend (Express + SQLite)

## Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, Radix UI components
- **Backend**: Express.js (for production static file serving)
- **LINE Backend**: Express.js with SQLite (better-sqlite3)
- **Language**: TypeScript (frontend), JavaScript ESM (LINE backend)
- **Package Manager**: pnpm

## Development
- Run `pnpm run build` to build the frontend
- Run `cd line-backend && node server.js` to start the unified server
- The app uses Japanese localization

## LINE Backend (Unified Server)
Located in `line-backend/` directory with the following components:
- `server.js` - Unified Express server (API, webhook, and static file serving)
- `db.js` - SQLite database module for estimates and user links

The unified server serves:
- Static files from `dist/public/` (Vite build output)
- API endpoints at `/api/*`
- LINE webhook at `/webhook`

### API Endpoints
- `GET /health` - Health check (returns `{ ok: true }`)
- `POST /api/estimates` - Save estimate and get LIFF URL
- `POST /api/link` - Link LINE user ID to estimate
- `POST /webhook` - LINE webhook for follow events

### Port Configuration
- Uses `process.env.PORT` (Replit standard)
- Falls back to port `3000` (Replit default public port)

### Required Secrets
- `LINE_CHANNEL_SECRET` - For webhook signature verification
- `LINE_CHANNEL_ACCESS_TOKEN` - For sending LINE messages
- `LIFF_ID` - For generating LIFF URLs

### LINE Webhook Setup
1. Replit開発ドメインを使用: `https://[REPLIT_DEV_DOMAIN]/webhook`
2. LINE Developersコンソール → Messaging API設定 → Webhook URL に設定
3. 「Webhookの利用」を有効化
4. 「検証」ボタンで接続確認（200 OKが返れば成功）

**注意**: ポート5000で起動する必要があります（Replit開発ドメインの外部公開ポート）

## Production
- Run `pnpm run build` to build both frontend and backend
- Run `pnpm run start` to start the production server

## Deployment
- Configured for autoscale deployment
- Build: `pnpm run build`
- Run: `node dist/index.js`

## Recent Changes
- 2026-01-06: Added LINE Backend MVP with SQLite, webhook, and API endpoints
- Fixed LIFF URL generation to handle prefixed LIFF_ID values
- Updated port handling to use PORT env var with fallback to 3000
- Added empty events handling for LINE webhook verification
- Added public URL and webhook URL logging on server startup
- Unified server: Express serves static files from dist/public + API + webhook on single port
