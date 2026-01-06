import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { saveEstimate, linkUserToEstimate, getEstimateByLineUserId } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Webhookエンドポイント（署名検証なし・最優先で配置）
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('>>> Webhook POST Received');
  res.status(200).send('OK');
});

// JSONパーサー
app.use(express.json());

// 静的ファイルの配信（Viteのビルド結果をExpressから直接出す）
app.use(express.static(path.join(__dirname, 'client/dist')));

// APIルート
app.post('/api/estimates', (req, res) => { /* 既存の処理 */ });
app.post('/api/link', (req, res) => { /* 既存の処理 */ });

// フロントエンドの全ルートを index.html に流す（SPA対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Replitが推奨する動的ポート設定
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified server running on port ${PORT}`);
});