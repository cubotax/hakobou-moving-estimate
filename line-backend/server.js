import express from "express";
import { nanoid } from "nanoid";

import {
  messagingApi,
  JSONParseError,
  SignatureValidationFailed,
  validateSignature,
} from "@line/bot-sdk";

import {
  insertEstimate,
  linkEstimate,
  getEstimateByLineUserId,
  getEstimateById,
} from "./db.js";

const app = express();

/**
 * ===============================
 * PORT（Replit 安定版）
 * ===============================
 * Replit では process.env.PORT が必ず渡される。
 * これ以外で listen すると衝突・Run不能の原因になる。
 */
const PORT = Number(process.env.PORT) || 3000;


// ========= ENV =========
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LIFF_ID = process.env.LIFF_ID || "";

const isLineConfigured = Boolean(
  LINE_CHANNEL_SECRET && LINE_CHANNEL_ACCESS_TOKEN
);

let client = null;
if (isLineConfigured) {
  client = new messagingApi.MessagingApiClient({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  });
}

// ========= BASIC ROUTES =========
app.get("/", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

// ========= API (JSON) =========
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
  } catch (err) {
    console.error("Error creating estimate:", err);
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
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
      return res.status(404).json({
        success: false,
        error: "Estimate not found",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error linking estimate:", err);
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
});

app.get("/api/estimates/:id", (req, res) => {
  try {
    const estimate = getEstimateById(req.params.id);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: "Estimate not found",
      });
    }
    res.json({ success: true, estimate });
  } catch (err) {
    console.error("Error getting estimate:", err);
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
});

// ========= WEBHOOK =========
app.post(
  "/webhook",
  express.raw({ type: ["application/json", "application/*+json"] }),
  async (req, res, next) => {
    try {
      // LINE未設定でも検証を通す
      if (!isLineConfigured) {
        console.log("Webhook received (LINE not configured)");
        return res.sendStatus(200);
      }

      const signature = req.get("x-line-signature") || "";
      const bodyText = req.body.toString("utf8");

      const ok = validateSignature(
        bodyText,
        LINE_CHANNEL_SECRET,
        signature
      );
      if (!ok) {
        throw new SignatureValidationFailed("invalid signature", signature);
      }

      req.body = JSON.parse(bodyText);

      const events = req.body?.events || [];
      await Promise.all(events.map(handleEvent));

      return res.sendStatus(200);
    } catch (err) {
      return next(err);
    }
  }
);

async function handleEvent(event) {
  if (!event) return null;
  if (event.type === "follow") {
    return handleFollowEvent(event);
  }
  return null;
}

async function handleFollowEvent(event) {
  if (!client) return null;

  const lineUserId = event.source?.userId;
  const estimate = lineUserId
    ? getEstimateByLineUserId(lineUserId)
    : null;

  const messages = estimate
    ? buildEstimateGreeting(estimate)
    : buildNormalGreeting();

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
        "引越しのお見積もりやご質問があればお気軽にどうぞ。",
    },
  ];
}

function buildEstimateGreeting(estimate) {
  const pickup = `${estimate.pickup_prefecture || ""}${estimate.pickup_city || ""}${estimate.pickup_town || ""}`;
  const delivery = `${estimate.delivery_prefecture || ""}${estimate.delivery_city || ""}${estimate.delivery_town || ""}`;
  const fee = Number(estimate.total_fee || 0).toLocaleString();

  return [
    {
      type: "text",
      text:
        `友だち追加ありがとうございます！\n\n` +
        `【集荷先】\n${pickup}\n\n` +
        `【お届け先】\n${delivery}\n\n` +
        `【お見積もり金額】\n¥${fee}`,
    },
  ];
}

// ========= ERROR HANDLER =========
app.use((err, _req, res, _next) => {
  if (err instanceof SignatureValidationFailed) {
    console.error("Signature validation failed:", err.signature);
    return res.status(401).send("Invalid signature");
  }
  if (err instanceof JSONParseError || err instanceof SyntaxError) {
    console.error("Invalid JSON:", err.message);
    return res.status(400).send("Invalid JSON");
  }
  console.error("Unhandled error:", err);
  return res.status(500).send("Internal server error");
});

// ========= START =========
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Health: /health");
  console.log("Webhook: /webhook");
  console.log("LINE configured:", isLineConfigured);
});
