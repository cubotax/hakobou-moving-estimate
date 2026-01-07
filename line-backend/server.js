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

const LME_API_KEY = process.env.LME_API_KEY || '';
const LME_API_ENDPOINT = process.env.LME_API_ENDPOINT || 'https://api.lme.jp/v1';
const LME_FIELD_ESTIMATE = process.env.LME_FIELD_ESTIMATE || '';
const LME_FIELD_ADDRESS = process.env.LME_FIELD_ADDRESS || '';

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://hakobou-moving-estimate--cubotax.replit.app';

function buildEstimateFlexMessage(estimate, detailUrl = null) {
  const totalFee = estimate.total_fee 
    ? `¥${Number(estimate.total_fee).toLocaleString()}`
    : '未計算';
  
  const pickupAddress = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town
  ].filter(Boolean).join('') || '未入力';
  
  const deliveryAddress = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town
  ].filter(Boolean).join('') || '未入力';
  
  const pickupDate = estimate.pickup_date || '未定';
  const deliveryDate = estimate.delivery_date || '未定';
  
  const actionUrl = detailUrl || APP_BASE_URL;

  return {
    type: 'flex',
    altText: `お見積もり金額: ${totalFee}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚚 お引越し見積もり',
            weight: 'bold',
            size: 'lg',
            color: '#1DB446'
          }
        ],
        backgroundColor: '#F5F5F5',
        paddingAll: '16px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: totalFee,
            weight: 'bold',
            size: '3xl',
            color: '#1DB446',
            align: 'center'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📍 集荷先',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: pickupAddress,
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                    wrap: true,
                    flex: 2
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🏠 お届け先',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: deliveryAddress,
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                    wrap: true,
                    flex: 2
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📅 集荷日',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: pickupDate,
                    size: 'sm',
                    color: '#111111',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📅 お届け日',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: deliveryDate,
                    size: 'sm',
                    color: '#111111',
                    align: 'end'
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'md',
            action: {
              type: 'uri',
              label: '詳細を確認',
              uri: actionUrl
            },
            color: '#1DB446'
          },
          {
            type: 'text',
            text: 'ご不明点はお気軽にメッセージください！',
            size: 'xs',
            color: '#888888',
            align: 'center',
            margin: 'md'
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

function buildEstimateDetailText(estimate) {
  const pickupAddress = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town
  ].filter(Boolean).join('') || '未入力';
  
  const deliveryAddress = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town
  ].filter(Boolean).join('') || '未入力';
  
  const pickupDate = estimate.pickup_date || '未定';
  const deliveryDate = estimate.delivery_date || '未定';
  
  const floorPickup = estimate.floor_pickup || 1;
  const hasElevatorPickup = estimate.has_elevator_pickup ? 'あり' : 'なし';
  const floorDelivery = estimate.floor_delivery || 1;
  const hasElevatorDelivery = estimate.has_elevator_delivery ? 'あり' : 'なし';
  const needsPacking = estimate.needs_packing ? '希望する' : '希望しない';

  return `【ご入力内容の詳細】

■ 集荷先
${pickupAddress}
${floorPickup}階 / エレベーター：${hasElevatorPickup}

■ お届け先
${deliveryAddress}
${floorDelivery}階 / エレベーター：${hasElevatorDelivery}

■ 引越し日程
集荷日：${pickupDate}
お届け日：${deliveryDate}

■ オプション
梱包サービス：${needsPacking}

ご不明点がございましたら、お気軽にメッセージをお送りください！`;
}

function buildWelcomeFlexMessage() {
  return {
    type: 'flex',
    altText: '友だち追加ありがとうございます！',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 友だち追加ありがとうございます！',
            weight: 'bold',
            size: 'md',
            wrap: true
          },
          {
            type: 'text',
            text: '引越しのお見積もり・ご相談はこちらからお気軽にどうぞ。',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'uri',
              label: 'Web見積もりを開始',
              uri: 'https://hakobou-moving-estimate--cubotax.replit.app/'
            },
            color: '#1DB446'
          }
        ]
      }
    }
  };
}

async function syncToLme(lineUserId, estimate) {
  if (!LME_API_KEY) {
    console.log('L-me API key not configured, skipping sync');
    return;
  }

  if (!LME_FIELD_ESTIMATE && !LME_FIELD_ADDRESS) {
    console.log('L-me field IDs not configured, skipping sync');
    return;
  }

  const totalFee = estimate.total_fee || 0;
  const pickupAddress = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town
  ].filter(Boolean).join('');
  
  const deliveryAddress = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town
  ].filter(Boolean).join('');

  const fields = [];
  
  if (LME_FIELD_ESTIMATE) {
    fields.push({
      id: LME_FIELD_ESTIMATE,
      value: String(totalFee)
    });
  }
  
  if (LME_FIELD_ADDRESS) {
    fields.push({
      id: LME_FIELD_ADDRESS,
      value: `集荷: ${pickupAddress || '未入力'} → お届け: ${deliveryAddress || '未入力'}`
    });
  }

  if (fields.length === 0) {
    console.log('No L-me fields to update, skipping sync');
    return;
  }

  try {
    const response = await fetch(`${LME_API_ENDPOINT}/friends/${lineUserId}/fields`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LME_API_KEY}`
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('L-me API error:', response.status, errorText);
    } else {
      console.log('L-me sync successful for user:', lineUserId);
    }
  } catch (error) {
    console.error('Failed to sync to L-me:', error);
  }
}

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
        const detailText = buildEstimateDetailText(linkedEstimate);
        messages = [
          buildEstimateFlexMessage(linkedEstimate),
          { type: 'text', text: detailText }
        ];
      } else {
        messages = [buildWelcomeFlexMessage()];
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

app.get('/api/liff-config', (req, res) => {
  const cleanLiffId = LIFF_ID ? LIFF_ID.replace(/^https?:\/\/liff\.line\.me\//, '') : '';
  res.json({
    liffId: cleanLiffId,
    botBasicId: process.env.LINE_BOT_BASIC_ID || ''
  });
});

app.post('/api/link', async (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body;
    
    if (!estimateId || !lineUserId) {
      return res.status(400).json({ error: 'estimateId and lineUserId are required' });
    }
    
    linkUserToEstimate(estimateId, lineUserId);
    
    const estimate = getEstimateByLineUserId(lineUserId);
    if (estimate) {
      const detailText = buildEstimateDetailText(estimate);
      const messages = [
        buildEstimateFlexMessage(estimate),
        { type: 'text', text: detailText }
      ];
      await sendLineMessage(lineUserId, messages);
      console.log('Sent estimate messages to user:', lineUserId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to link user:', error);
    res.status(500).json({ error: 'Failed to link user' });
  }
});

// LIFF static files (line-backend/public)
const liffPublicPath = path.join(__dirname, 'public');
app.use(express.static(liffPublicPath));

// Static file serving (Vite build output - correct path)
const staticPath = path.join(__dirname, '..', 'dist', 'public');
app.use(express.static(staticPath));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Start server (Replit dev domain expects port 5000)
const PORT = process.env.PORT || 5000;
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
