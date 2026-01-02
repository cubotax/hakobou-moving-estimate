# Moving Estimate Application

## Overview
A Japanese moving estimate form application (引越し見積もりフォーム) that helps users calculate moving costs in 3 simple steps: address input, conditions selection, and estimate results.

## Project Structure
- `client/` - React frontend with Vite
- `server/` - Express.js production server
- `shared/` - Shared types and utilities
- `line-backend/` - LINE Messaging API integration server

## Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, Radix UI components
- **Backend**: Express.js (for production static file serving)
- **LINE Backend**: Node.js + Express + SQLite + LINE Messaging API
- **Language**: TypeScript (frontend), JavaScript (LINE backend)
- **Package Manager**: pnpm (frontend), npm (LINE backend)

## Development
- Run `pnpm run dev` to start the Vite dev server on port 5000
- The app uses Japanese localization

## Production
- Run `pnpm run build` to build both frontend and backend
- Run `pnpm run start` to start the production server

## Deployment
- Configured for autoscale deployment
- Build: `pnpm run build`
- Run: `node dist/index.js`

## LINE Backend (line-backend/)
LINE連携用のバックエンドサーバー。見積もりデータをDBに保存し、LINEユーザーと紐付ける機能を提供。

### 環境変数（必須）
- `LINE_CHANNEL_SECRET` - LINEチャネルシークレット
- `LINE_CHANNEL_ACCESS_TOKEN` - LINEチャネルアクセストークン
- `LIFF_ID` - LIFF ID（オプション）

### API エンドポイント
- `POST /api/estimates` - 見積もりデータを保存し、estimateId と liffUrl を返す
- `POST /api/link` - estimateId と lineUserId を紐付ける
- `GET /api/estimates/:id` - 見積もりデータを取得
- `POST /webhook` - LINE Webhook（follow イベントを処理）

### 起動方法
```bash
cd line-backend && npm start
```
ポート3001で起動
