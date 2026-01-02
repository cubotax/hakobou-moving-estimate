import express from 'express';
import { messagingApi, middleware, JSONParseError, SignatureValidationFailed } from '@line/bot-sdk';
import { nanoid } from 'nanoid';
import { insertEstimate, linkEstimate, getEstimateByLineUserId, getEstimateById } from './db.js';

const app = express();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LIFF_ID = process.env.LIFF_ID || '';

const isLineConfigured = LINE_CHANNEL_SECRET && LINE_CHANNEL_ACCESS_TOKEN;

let lineConfig = null;
let client = null;

if (isLineConfigured) {
  lineConfig = {
    channelSecret: LINE_CHANNEL_SECRET,
  };

  client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/estimates', express.json(), (req, res) => {
  try {
    const estimateId = nanoid(12);
    const estimateData = {
      id: estimateId,
      ...req.body,
    };
    
    insertEstimate(estimateData);
    
    const liffUrl = LIFF_ID 
      ? `https://liff.line.me/${LIFF_ID}?estimateId=${estimateId}`
      : `https://line.me/R/ti/p/@your_line_id?estimateId=${estimateId}`;
    
    res.json({
      success: true,
      estimateId,
      liffUrl,
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/link', express.json(), (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body;
    
    if (!estimateId || !lineUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'estimateId and lineUserId are required' 
      });
    }
    
    const updated = linkEstimate(estimateId, lineUserId);
    
    if (updated) {
      res.json({ success: true, message: 'Linked successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Estimate not found' });
    }
  } catch (error) {
    console.error('Error linking estimate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/estimates/:id', (req, res) => {
  try {
    const estimate = getEstimateById(req.params.id);
    if (estimate) {
      res.json({ success: true, estimate });
    } else {
      res.status(404).json({ success: false, error: 'Estimate not found' });
    }
  } catch (error) {
    console.error('Error getting estimate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

if (isLineConfigured) {
  app.post('/webhook', middleware(lineConfig), async (req, res) => {
    try {
      const events = req.body.events || [];
      
      await Promise.all(events.map(handleEvent));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
} else {
  app.post('/webhook', express.json(), async (req, res) => {
    console.log('Webhook received (LINE not configured):', req.body);
    res.json({ success: true, message: 'LINE credentials not configured' });
  });
}

async function handleEvent(event) {
  console.log('Received event:', event.type);
  
  if (event.type === 'follow') {
    return handleFollowEvent(event);
  }
  
  return null;
}

async function handleFollowEvent(event) {
  const lineUserId = event.source.userId;
  console.log('Follow event from:', lineUserId);
  
  if (!client) {
    console.log('LINE client not configured');
    return null;
  }
  
  const estimate = getEstimateByLineUserId(lineUserId);
  
  let messages;
  
  if (estimate) {
    const pickupAddress = `${estimate.pickup_prefecture}${estimate.pickup_city}${estimate.pickup_town}`;
    const deliveryAddress = `${estimate.delivery_prefecture}${estimate.delivery_city}${estimate.delivery_town}`;
    const totalFee = estimate.total_fee?.toLocaleString() || '0';
    
    messages = [
      {
        type: 'text',
        text: `友だち追加ありがとうございます！\n\nお見積もり内容を確認しました。\n\n【集荷先】\n${pickupAddress}\n\n【お届け先】\n${deliveryAddress}\n\n【お見積もり金額】\n¥${totalFee}\n\nご不明な点がございましたら、お気軽にメッセージをお送りください。`,
      },
    ];
  } else {
    messages = [
      {
        type: 'text',
        text: '友だち追加ありがとうございます！\n\n引越しのお見積もりや、ご質問がございましたら、お気軽にメッセージをお送りください。',
      },
    ];
  }
  
  return client.replyMessage({
    replyToken: event.replyToken,
    messages,
  });
}

app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    console.error('Signature validation failed:', err.signature);
    res.status(401).send('Invalid signature');
    return;
  }
  if (err instanceof JSONParseError) {
    console.error('JSON parse error:', err.raw);
    res.status(400).send('Invalid JSON');
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
});

const PORT = process.env.LINE_SERVER_PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LINE Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('');
  
  if (!isLineConfigured) {
    console.log('WARNING: LINE credentials not configured!');
    console.log('Set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN to enable LINE integration.');
    console.log('');
  } else {
    console.log('LINE integration: ENABLED');
    console.log(`Webhook URL: https://<your-domain>/webhook`);
    console.log('');
  }
  
  console.log('API Endpoints:');
  console.log(`  POST /api/estimates - Create a new estimate`);
  console.log(`  POST /api/link      - Link estimateId with lineUserId`);
  console.log(`  GET  /api/estimates/:id - Get estimate by ID`);
  console.log(`  POST /webhook       - LINE Webhook endpoint`);
});
