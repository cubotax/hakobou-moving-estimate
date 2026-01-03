import express from "express";
import { nanoid } from "nanoid";

import {
  middleware,
  messagingApi,
  JSONParseError,
  SignatureValidationFailed,
} from "@line/bot-sdk";

import {
  insertEstimate,
  linkEstimate,
  getEstimateByLineUserId,
  getEstimateById,
} from "./db.js";

const app = express();

/**
 * Replit では PORT は必ず process.env.PORT を使う
 * （固定 3000 にすると外部アクセスできないことがある）
 */
const PORT = Number(process.env.PORT || 3000);

// ========= ENV =========
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LIFF_ID = process.env.LIFF_ID || "";

const isLineConfigured = Boolean(
  LINE_CHANNEL_SECRET && LINE_CHANNEL_ACCESS_TOKEN
);

let lineConfig = null;
let client = null;

if (isLineConfigured) {
  lineConfig = { channelSecret: LINE_CHANNEL_SECRET };
  client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });
}

// ========= BASIC ROUTES =========
app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

// ========= API (JSON) =========
// API群だけ JSON を有効化（webhook は middleware が読むのでここでは付けない）
app.use("/api", express.json());

app.post("/api/estimates", (req, res) => {
  try {
    const estimateId = nanoid(12);
    const estimateData = { id: estimateId, ...req.body };

    insertEstimate(estimateData);

    const liffUrl = LIFF_ID
      ? `https://liff.line.me/${LIFF_ID}?estimateId=${estimateId}`
      : `https://line.me/R/ti/p/@your_line_id?estimateId=${estimateId}`;

    res.json({ success: true, estimateId, liffUrl });
  } catch (error) {
    console.error("Error creating estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

app.post("/api/link", (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body || {};

    if (!estimateId || !lineUserId) {
      return res.status(400).json({
        success: false,
        error: "estimateId and lineUserId are required",
      });
    }

    const updated = linkEstimate(estimateId, lineUserId);

    if (!updated) {
      return res.status(404).json({ success: false, error: "Estimate not found" });
    }

    res.json({ success: true, message: "Linked successfully" });
  } catch (error) {
    console.error("Error linking estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

app.get("/api/estimates/:id", (req, res) => {
  try {
    const estimate = getEstimateById(req.params.id);

    if (!estimate) {
      return res.status(404).json({ success: false, error: "Estimate not found" });
    }

    res.json({ success: true, estimate });
  } catch (error) {
    console.error("Error getting estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

// ========= WEBHOOK =========
if (isLineConfigured) {
  // LINE middleware が raw body を読むので、ここで express.json() を先に付けない
  app.post("/webhook", middleware(lineConfig), async (req, res) => {
    try {
      const events = req.body?.events || [];
      await Promise.all(events.map(handleEvent));
      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error);
      res.sendStatus(500);
    }
  });
} else {
  // 設定なしでも疎通確認できるように 200 返す
  app.post("/webhook", express.json(), (req, res) => {
    console.log("Webhook received (LINE not configured):", req.body);
    res.status(200).json({ success: true, message: "LINE not configured" });
  });
}

async function handleEvent(event) {
  if (!event) return null;
  console.log("Received event:", event.type);

  if (event.type === "follow") {
    return handleFollowEvent(event);
  }
  return null;
}

async function handleFollowEvent(event) {
  const lineUserId = event?.source?.userId;

  if (!client) {
    console.log("LINE client not configured");
    return null;
  }

  const estimate = lineUserId ? getEstimateByLineUserId(lineUserId) : null;

  const messages = estimate ? buildEstimateGreeting(estimate) : buildNormalGreeting();

  // follow は replyToken があるので replyMessage でOK
  return client.replyMessage({
    replyToken: event.replyToken,
    messages,
  });
}

function buildNormalGreeting() {
  return [
    {
      type: "text",
      text:
        "友だち追加ありがとうございます！\n\n" +
        "引越しのお見積もりや、ご質問がございましたら、お気軽にメッセージをお送りください。",
    },
  ];
}

function buildEstimateGreeting(estimate) {
  const pickupAddress = `${estimate.pickup_prefecture || ""}${estimate.pickup_city || ""}${estimate.pickup_town || ""}`;
  const deliveryAddress = `${estimate.delivery_prefecture || ""}${estimate.delivery_city || ""}${estimate.delivery_town || ""}`;

  const feeNum = Number(estimate.total_fee);
  const totalFee = Number.isFinite(feeNum) ? feeNum.toLocaleString() : String(estimate.total_fee || "0");

  return [
    {
      type: "text",
      text:
        `友だち追加ありがとうございます！\n\n` +
        `お見積もり内容を確認しました。\n\n` +
        `【集荷先】\n${pickupAddress}\n\n` +
        `【お届け先】\n${deliveryAddress}\n\n` +
        `【お見積もり金額】\n¥${totalFee}\n\n` +
        `この内容をもとに、続きのご相談を進められます。\n` +
        `ご希望があれば「日程」「荷物量」「エリア」なども教えてください。`,
    },
  ];
}

// ========= ERROR HANDLER =========
app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    console.error("Signature validation failed:", err.signature);
    return res.status(401).send("Invalid signature");
  }
  if (err instanceof JSONParseError) {
    console.error("JSON parse error:", err.raw);
    return res.status(400).send("Invalid JSON");
  }
  console.error("Unhandled error:", err);
  return res.status(500).send("Internal server error");
});

// ========= START =========
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Webhook: /webhook`);
  console.log(`API: /api/estimates, /api/link, /api/estimates/:id`);
  console.log(`LINE configured: ${isLineConfigured}`);
});
