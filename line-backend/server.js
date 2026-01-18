/**
 * LINE見積もりBot サーバー（Flex Message対応版）
 *
 * - /api/link の pushMessage でも Flex Message + 詳細テキストを送信
 * - follow(webhook) の replyMessage でも Flex Message + 詳細テキストを送信
 * - message(webhook) の replyMessage でも（見積もりがあれば）Flex Message + 詳細テキストを送信
 */

// ===== 目印ログ（起動確認用）=====
console.log("=== server.js booted A/B ===");

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

import cors from "cors";

const app = express();
app.use(cors()); // CORS許可

const PORT = Number(process.env.PORT || 3000);

// ========= ENV =========
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LIFF_ID = process.env.LIFF_ID || "";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://mitsumori.hakobou.com/";

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
app.use("/api", express.json());

// 見積もり作成（async対応）
app.post("/api/estimates", async (req, res) => {
  try {
    const estimateId = nanoid(12);
    const estimateData = { id: estimateId, ...req.body };

    await insertEstimate(estimateData);

    const liffUrl = LIFF_ID
      ? `https://liff.line.me/${LIFF_ID}?estimateId=${estimateId}`
      : `https://line.me/R/ti/p/@602epmvz?estimateId=${estimateId}`;

    res.json({ success: true, estimateId, liffUrl });
  } catch (error) {
    console.error("Error creating estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

// 見積もりとLINEユーザーの紐づけ + メッセージ送信
app.post("/api/link", async (req, res) => {
  try {
    const { estimateId, lineUserId } = req.body || {};

    if (!estimateId || !lineUserId) {
      return res.status(400).json({
        success: false,
        error: "estimateId and lineUserId are required",
      });
    }

    // 見積もりデータを取得
    const estimate = await getEstimateById(estimateId);

    if (!estimate) {
      return res
        .status(404)
        .json({ success: false, error: "Estimate not found" });
    }

    // lineUserIdを紐づけ
    const updated = await linkEstimate(estimateId, lineUserId);

    if (!updated) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to link estimate" });
    }

    // Messaging APIでプッシュメッセージを送信（Flex + 詳細テキスト）
    if (client) {
      const detailUrl = buildLiffDetailUrl(estimateId);
      const messages = buildEstimateMessages(estimate, detailUrl);

      await client.pushMessage({
        to: lineUserId,
        messages,
      });
    }

    res.json({ success: true, message: "Linked and message sent successfully" });
  } catch (error) {
    console.error("Error linking estimate:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

// 見積もり取得（async対応）
app.get("/api/estimates/:id", async (req, res) => {
  try {
    const estimate = await getEstimateById(req.params.id);

    if (!estimate) {
      return res
        .status(404)
        .json({ success: false, error: "Estimate not found" });
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
  app.post("/webhook", express.json(), (req, res) => {
    console.log("Webhook received (LINE not configured):", req.body);
    res.status(200).json({ success: true, message: "LINE not configured" });
  });
}

// ======================
// handleEvent（本番用：Webhookでは一切送信しない）
// ======================
async function handleEvent(event) {
  if (!event) return null;

  const t = event.type;
  const mt = event.message?.type;
  console.log("Received event:", t, "messageType:", mt);

  // 友だち追加：サーバーからは何も送らない
  if (t === "follow") {
    console.log("-> route: ignore follow (handled by LINE official / L Message)");
    return null;
  }

  // トークメッセージ：自動返信しない（人対応）
  if (t === "message") {
    console.log("-> route: ignore message (human support)");
    return null;
  }

  console.log("-> route: ignore");
  return null;
}


// フォローイベント処理（async対応）
async function handleFollowEvent(event) {
  const lineUserId = event?.source?.userId;

  if (!client) {
    console.log("LINE client not configured");
    return null;
  }

  const estimate = lineUserId ? await getEstimateByLineUserId(lineUserId) : null;

  const messages = estimate
    ? buildEstimateMessages(estimate, buildLiffDetailUrl(estimate.id))
    : buildWelcomeMessages();

  return client.replyMessage({
    replyToken: event.replyToken,
    messages,
  });
}

// ======================
// B) handleMessageEvent（ログ＋例外詳細出力版）
// ======================
async function handleMessageEvent(event) {
  const lineUserId = event?.source?.userId;
  console.log("handleMessageEvent lineUserId:", lineUserId);

  if (!client) {
    console.log("LINE client not configured");
    return null;
  }

  const estimate = lineUserId ? await getEstimateByLineUserId(lineUserId) : null;
  console.log("estimate exists:", Boolean(estimate), estimate?.id);

  const messages = estimate
    ? buildEstimateMessages(estimate, buildLiffDetailUrl(estimate.id))
    : buildWelcomeMessages();

  try {
    const r = await client.replyMessage({
      replyToken: event.replyToken,
      messages,
    });
    console.log("replyMessage OK");
    return r;
  } catch (e) {
    console.error("replyMessage NG", e?.message || e);
    if (e?.response?.data) {
      console.error("LINE error detail:", e.response.data);
    }
    return null;
  }
}

/**
 * ========== Message Builders ==========
 */

function buildWelcomeMessages() {
  return [
    {
      type: "text",
      text:
        "友だち追加ありがとうございます！\n\n" +
        "引越しのお見積もりや、ご質問がございましたら、お気軽にメッセージをお送りください。",
    },
  ];
}

function buildLiffDetailUrl(estimateId) {
  if (LIFF_ID) return `https://liff.line.me/${LIFF_ID}?estimateId=${estimateId}`;
  // APP_BASE_URL が末尾/でも、? はそのまま繋いでOK（//? にはならない）
  return `${APP_BASE_URL}?estimateId=${estimateId}`;
}

function formatDateJP(dateStr) {
  if (!dateStr) return "未定";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "未定";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildEstimateMessages(estimate, detailUrl = null) {
  const flex = buildEstimateFlexMessage(estimate, detailUrl);
  const detailText = buildEstimateDetailText(estimate);

  return [
    flex,
    {
      type: "text",
      text: detailText,
    },
  ];
}

function buildEstimateFlexMessage(estimate, detailUrl = null) {
  const feeNum = Number(estimate.total_fee);
  const totalFee = Number.isFinite(feeNum)
    ? `¥${feeNum.toLocaleString()}`
    : `¥${Number(estimate.total_fee || 0).toLocaleString()}`;

  const pickupAddress = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town,
  ]
    .filter(Boolean)
    .join("") || "未入力";

  const deliveryAddress = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town,
  ]
    .filter(Boolean)
    .join("") || "未入力";

  const pickupDate = formatDateJP(estimate.pickup_date);
  const deliveryDate = formatDateJP(estimate.delivery_date);

  const actionUrl = detailUrl || APP_BASE_URL;

  return {
    type: "flex",
    altText: `お見積もり金額: ${totalFee}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🚚 お引越し見積もり",
            weight: "bold",
            size: "lg",
            color: "#1DB446",
          },
        ],
        backgroundColor: "#F5F5F5",
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: totalFee,
            weight: "bold",
            size: "3xl",
            color: "#1DB446",
            align: "center",
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📍 集荷先",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: pickupAddress,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                    wrap: true,
                    flex: 2,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🏠 お届け先",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: deliveryAddress,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                    wrap: true,
                    flex: 2,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📅 集荷日",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: pickupDate,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📅 お届け日",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: deliveryDate,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "md",
            action: {
              type: "uri",
              label: "詳細を確認",
              uri: actionUrl,
            },
            color: "#1DB446",
          },
          {
            type: "text",
            text: "ご不明点はお気軽にメッセージください！",
            size: "xs",
            color: "#888888",
            align: "center",
            margin: "md",
            wrap: true,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

function buildEstimateDetailText(estimate) {
  const pickupAddress = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town,
  ]
    .filter(Boolean)
    .join("") || "未入力";

  const deliveryAddress = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town,
  ]
    .filter(Boolean)
    .join("") || "未入力";

  const pickupDate = formatDateJP(estimate.pickup_date);
  const deliveryDate = formatDateJP(estimate.delivery_date);

  const floorPickup = estimate.floor_pickup || 1;
  const hasElevatorPickup = estimate.has_elevator_pickup ? "あり" : "なし";
  const floorDelivery = estimate.floor_delivery || 1;
  const hasElevatorDelivery = estimate.has_elevator_delivery ? "あり" : "なし";
  const needsPacking = estimate.needs_packing ? "希望する" : "希望しない";

  const feeNum = Number(estimate.total_fee);
  const totalFee = Number.isFinite(feeNum)
    ? feeNum.toLocaleString()
    : String(estimate.total_fee || "0");

  return (
    `【ご入力内容の詳細】\n\n` +
    `■ 集荷先\n${pickupAddress}\n${floorPickup}階 / エレベーター：${hasElevatorPickup}\n\n` +
    `■ お届け先\n${deliveryAddress}\n${floorDelivery}階 / エレベーター：${hasElevatorDelivery}\n\n` +
    `■ 引越し日程\n集荷日：${pickupDate}\nお届け日：${deliveryDate}\n\n` +
    `■ オプション\n梱包サービス：${needsPacking}\n\n` +
    `■ お見積もり金額\n¥${totalFee}\n\n` +
    `ご不明点がございましたら、お気軽にメッセージをお送りください！`
  );
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