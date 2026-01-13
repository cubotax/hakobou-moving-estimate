# 引越し見積もりフォーム

簡単3ステップで引越し見積もり金額を確認できるWebアプリケーション。

## 技術スタック

- **フロントエンド**: React + Vite + Tailwind CSS 4
- **ルーティング**: wouter
- **UIコンポーネント**: Radix UI + shadcn/ui
- **バックエンド（LINE連携）**: Express.js

## ローカル開発

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# ビルド確認
npx serve dist/public
```

## Vercelへのデプロイ

このプロジェクトは **Vite SPA** としてVercelにデプロイするよう構成されています。

### 設定内容（vercel.json）

- **Framework**: null（自動検出を無効化し、Viteビルドを使用）
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`
- **Output Directory**: `dist/public`
- **Rewrites**: SPAフォールバック（/step1等への直アクセスを/index.htmlにリダイレクト）

### デプロイ手順

1. GitHubリポジトリにpush
2. Vercelダッシュボードでプロジェクトをインポート
3. **Root Directory** は空欄（リポジトリルート）のまま
4. 設定は `vercel.json` が自動適用される
5. デプロイを実行

### 環境変数（任意）

| 変数名 | 説明 |
|--------|------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics用エンドポイント（任意） |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics用サイトID（任意） |

## LINE連携バックエンド

LINE Messaging APIとLIFF連携は `line-backend/` で実装されています（別途デプロイが必要）。

```bash
# 開発
pnpm dev:api

# 本番
pnpm start
```

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `LINE_CHANNEL_SECRET` | LINE Messaging API Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Access Token |
| `LIFF_ID` | LIFF ID（オプション） |

## プロジェクト構造

```
├── client/              # React SPA（Vite）
│   ├── src/
│   │   ├── components/  # UIコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── hooks/       # カスタムフック
│   │   ├── lib/         # ユーティリティ
│   │   ├── index.css    # Tailwindスタイル
│   │   └── App.tsx      # ルートコンポーネント
│   └── index.html       # エントリーHTML
├── line-backend/        # LINE連携バックエンド
├── shared/              # 共有型定義
├── vite.config.ts       # Vite設定
├── vercel.json          # Vercelデプロイ設定
└── package.json
```
