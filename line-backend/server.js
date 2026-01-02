import express from "express";
import {
  messagingApi,
  middleware,
  JSONParseError,
  SignatureValidationFailed,
} from "@line/bot-sdk";
import { nanoid } from "nanoid";
import {
  insertEstimate,
  linkEstimate,
  getEstimateByLineUserId,
  getEstimateById,
} from "./db.js";

const app = express();

// ========= ENV =========
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LIFF_ID = process.env.LIFF_ID || "";

// ✅ Replit Deploy は基本 process.env.PORT を使う（ここが最重要）
const PORT = Number(process.env.PORT || process.env.LINE_SERVER_PORT || 3000);

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

// ========= ROUTES =========

// ✅ Root を作る（公開URL直アクセスで 404 を避ける）
app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/estimates", express.json(), (req, res) => {
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

app.post("/api/link", express.json(), (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body || {};

    if (!estimateId || !lineUserId) {
      return res.status(400).json({
        success: false,
        error: "estimateId and lineUserId are required",
      });
    }

    const updated = linkEstimate(estimateId, lineUserId);

    if (updated) {
      res.json({ success: true, message: "Linked successfully" });
    } else {
      res.status(404).json({ success: false, error: "Estimate not found" });
    }
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
    if (estimate) {
      res.json({ success: true, estimate });
    } else {
      res.status(404).json({ success: false, error: "Estimate not found" });
    }
  } catch (error) {
    console.error("Error getting estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

// ========= WEBHOOK =========
if (isLineConfigured) {
  app.post("/webhook", middleware(lineConfig), async (req, res) => {
    try {
      const events = req.body?.events || [];
      await Promise.all(events.map(handleEvent));
      // ✅ LINE は 200 系を返せば OK
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res
        .status(500)
        .json({ success: false, error: error?.message || String(error) });
    }
  });
} else {
  // ✅ 設定が入ってない時も 200 で返す（疎通確認用）
  app.post("/webhook", express.json(), async (req, res) => {
    console.log("Webhook received (LINE not configured):", req.body);
    res
      .status(200)
      .json({ success: true, message: "LINE credentials not configured" });
  });
}

async function handleEvent(event) {
  console.log("Received event:", event?.type);
  if (event?.type === "follow") return handleFollowEvent(event);
  return null;
}

async function handleFollowEvent(event) {
  const lineUserId = event?.source?.userId;
  console.log("Follow event from:", lineUserId);

  if (!client) {
    console.log("LINE client not configured");
    return null;
  }

  const estimate = lineUserId ? getEstimateByLineUserId(lineUserId) : null;

  let messages;

  if (estimate) {
    const pickupAddress = `${estimate.pickup_prefecture || ""}${
      estimate.pickup_city || ""
    }${estimate.pickup_town || ""}`;

    const deliveryAddress = `${estimate.delivery_prefecture || ""}${
      estimate.delivery_city || ""
    }${estimate.delivery_town || ""}`;

    // ✅ total_fee が数値/文字列どちらでも事故らない
    const feeNum = Number(estimate.total_fee);
    const totalFee = Number.isFinite(feeNum)
      ? feeNum.toLocaleString()
      : String(estimate.total_fee || "0");

    messages = [
      {
        type: "text",
        text:
          `友だち追加ありがとうございます！\n\n` +
          `お見積もり内容を確認しました。\n\n` +
          `【集荷先】\n${pickupAddress}\n\n` +
          `【お届け先】\n${deliveryAddress}\n\n` +
          `【お見積もり金額】\n¥${totalFee}\n\n` +
          `ご不明な点がございましたら、お気軽にメッセージをお送りください。`,
      },
    ];
  } else {
    messages = [
      {
        type: "text",
        text:
          "友だち追加ありがとうございます！\n\n" +
          "引越しのお見積もりや、ご質問がございましたら、お気軽にメッセージをお送りください。",
      },
    ];
  }

  // ✅ follow では replyToken が来るので replyMessage でOK
  return client.replyMessage({
    replyToken: event.replyToken,
    messages,
  });
}

// ========= ERROR HANDLER =========
app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    console.error("Signature validation failed:", err.signature);
    res.status(401).send("Invalid signature");
    return;
  }
  if (err instanceof JSONParseError) {
    console.error("JSON parse error:", err.raw);
    res.status(400).send("Invalid JSON");
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).send("Internal server error");
});

// ========= START =========
app.listen(PORT, "0.0.0.0", () => {
  console.log(`LINE Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log("");

  if (!isLineConfigured) {
    console.log("WARNING: LINE credentials not configured!");
    console.log(
      "Set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN to enable LINE integration."
    );
    console.log("");
  } else {
    console.log("LINE integration: ENABLED");
    console.log(`Webhook URL: https://<your-domain>/webhook`);
    console.log("");
  }

  console.log("API Endpoints:");
  console.log("  GET  /              - Root OK");
  console.log("  GET  /health        - Health check");
  console.log("  POST /api/estimates - Create a new estimate");
  console.log("  POST /api/link      - Link estimateId with lineUserId");
  console.log("  GET  /api/estimates/:id - Get estimate by ID");
  console.log("  POST /webhook       - LINE Webhook endpoint");
});
