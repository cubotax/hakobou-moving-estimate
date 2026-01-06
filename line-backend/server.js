import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { saveEstimate, linkUserToEstimate, getEstimateByLineUserId } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LIFF_ID = process.env.LIFF_ID || '';

function verifySignature(body, signature) {
  if (!LINE_CHANNEL_SECRET) {
    console.warn('LINE_CHANNEL_SECRET is not set, skipping signature verification');
    return true;
  }
  const hash = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

async function sendLineMessage(lineUserId, messages) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set, skipping message send');
    return;
  }
  
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API error:', response.status, errorText);
    }
  } catch (error) {
    console.error('Failed to send LINE message:', error);
  }
}

// Health check (top priority)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Webhook endpoint (must use raw body for signature verification)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('>>> Webhook POST Received');
  res.status(200).send('OK');
  
  const signature = req.headers['x-line-signature'];
  const body = req.body;
  
  if (!body || body.length === 0) {
    console.log('Webhook verification request received (empty body)');
    return;
  }
  
  if (!verifySignature(body, signature)) {
    console.error('Invalid signature');
    return;
  }
  
  let events;
  try {
    const parsed = JSON.parse(body.toString());
    events = parsed.events || [];
  } catch (error) {
    console.error('Failed to parse webhook body:', error);
    return;
  }
  
  if (events.length === 0) {
    console.log('Webhook verification request received (empty events)');
    return;
  }
  
  for (const event of events) {
    if (event.type === 'follow') {
      const lineUserId = event.source.userId;
      console.log('Follow event received from:', lineUserId);
      
      const linkedEstimate = getEstimateByLineUserId(lineUserId);
      
      let messages;
      if (linkedEstimate) {
        const totalFeeFormatted = linkedEstimate.total_fee 
          ? `¥${linkedEstimate.total_fee.toLocaleString()}`
          : '未計算';
        
        messages = [{
          type: 'text',
          text: `友だち追加ありがとうございます！\n\nWeb見積もりでご入力いただいた情報を確認しました。\n\n【見積もり金額】\n${totalFeeFormatted}\n\n【集荷先】\n${linkedEstimate.pickup_prefecture}${linkedEstimate.pickup_city}${linkedEstimate.pickup_town}\n\n【お届け先】\n${linkedEstimate.delivery_prefecture}${linkedEstimate.delivery_city}${linkedEstimate.delivery_town}\n\nご不明点がございましたら、お気軽にメッセージをお送りください！`
        }];
      } else {
        messages = [{
          type: 'text',
          text: '友だち追加ありがとうございます！\n\n引越しのお見積もり・ご相談はこちらからお気軽にどうぞ。'
        }];
      }
      
      await sendLineMessage(lineUserId, messages);
    }
  }
});

// JSON parser for API routes
app.use(express.json());

// API routes
app.post('/api/estimates', (req, res) => {
  try {
    const estimateId = randomUUID();
    const estimateData = {
      id: estimateId,
      pickupPrefecture: req.body.pickupPrefecture,
      pickupCity: req.body.pickupCity,
      pickupTown: req.body.pickupTown,
      deliveryPrefecture: req.body.deliveryPrefecture,
      deliveryCity: req.body.deliveryCity,
      deliveryTown: req.body.deliveryTown,
      pickupDate: req.body.pickupDate,
      deliveryDate: req.body.deliveryDate,
      totalFee: req.body.totalFee
    };
    
    saveEstimate(estimateData);
    
    let liffUrl;
    if (LIFF_ID) {
      const cleanLiffId = LIFF_ID.replace(/^https?:\/\/liff\.line\.me\//, '');
      liffUrl = `https://liff.line.me/${cleanLiffId}?estimateId=${estimateId}`;
    } else {
      liffUrl = `https://liff.line.me/YOUR_LIFF_ID?estimateId=${estimateId}`;
    }
    
    res.json({
      estimateId,
      liffUrl
    });
  } catch (error) {
    console.error('Failed to save estimate:', error);
    res.status(500).json({ error: 'Failed to save estimate' });
  }
});

app.post('/api/link', (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body;
    
    if (!estimateId || !lineUserId) {
      return res.status(400).json({ error: 'estimateId and lineUserId are required' });
    }
    
    linkUserToEstimate(estimateId, lineUserId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to link user:', error);
    res.status(500).json({ error: 'Failed to link user' });
  }
});

// Static file serving (Vite build output - correct path)
const staticPath = path.join(__dirname, '..', 'dist', 'public');
app.use(express.static(staticPath));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Static files: ${staticPath}`);
  
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    console.log(`Public URL: https://${devDomain}`);
    console.log(`Webhook URL: https://${devDomain}/webhook`);
  }
});
