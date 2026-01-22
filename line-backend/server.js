/**
 * LINE見積もりBot サーバー（Flex Message対応版）
 *
 * - /api/link の pushMessage でも Flex Message + 詳細テキストを送信
 * - follow(webhook) の replyMessage でも Flex Message + 詳細テキストを送信
 * - message(webhook) の replyMessage でも（見積もりがあれば）Flex Message + 詳細テキストを送信
 */

import 'dotenv/config';

// ===== 目印ログ（起動確認用）=====
console.log("=== server.js booted A/B ===");

import express from "express";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

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
  updateEstimateWithApplication,
  updateEstimateToConsulting,
} from "./db.js";

import cors from "cors";
import cookieParser from "cookie-parser";

// 管理画面用ルート
import adminRoutes from "./adminRoutes.js";
import couponRoutes from "./publicRoutes.js";

import { Resend } from "resend";

// Resend初期化
console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 見積もり有効期限（日数）
const ESTIMATE_EXPIRY_DAYS = 3;

/**
 * 見積もりの有効期限をチェック
 * @param {Object} estimate - 見積もりオブジェクト
 * @returns {boolean} - 有効期限内ならtrue、期限切れならfalse
 */
function isEstimateValid(estimate) {
  if (!estimate || !estimate.created_at) return false;

  // すでに相談中以降のステータスなら有効
  const activeStatuses = ['consulting', 'applied', 'invite_sent', 'payment_sent', 'paid'];
  if (activeStatuses.includes(estimate.status)) {
    return true;
  }

  // 初回見積（estimated）の場合は3日間の有効期限をチェック
  const createdAt = new Date(estimate.created_at);
  const now = new Date();
  const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

  return diffDays <= ESTIMATE_EXPIRY_DAYS;
}

/**
 * 見積もり作成時のメール通知
 */
async function sendEstimateNotification(estimate) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !resend) {
    console.log("メール通知設定がありません。スキップします。");
    return;
  }

  // データ構造に対応（DBから取得した場合とフロントから送信された場合の両方に対応）
  const pickupAddress = estimate.pickupAddress || {
    prefecture: estimate.pickup_prefecture,
    city: estimate.pickup_city,
    town: estimate.pickup_town,
  };
  const deliveryAddress = estimate.deliveryAddress || {
    prefecture: estimate.delivery_prefecture,
    city: estimate.delivery_city,
    town: estimate.delivery_town,
  };
  const dates = estimate.dates || {
    pickupDate: estimate.pickup_date,
    deliveryDate: estimate.delivery_date,
  };
  const conditions = estimate.conditions || {
    floorPickup: estimate.floor_pickup,
    hasElevatorPickup: estimate.has_elevator_pickup,
    floorDelivery: estimate.floor_delivery,
    hasElevatorDelivery: estimate.has_elevator_delivery,
    needsPacking: estimate.needs_packing,
  };

  const planName = estimate.plan === "helper" ? "ヘルパープラン" : estimate.plan === "omakase" ? "お任せプラン" : "未選択";
  const packingService = conditions.needsPacking ? "希望する" : "希望しない";
  const elevatorPickup = conditions.hasElevatorPickup ? "あり" : "なし";
  const elevatorDelivery = conditions.hasElevatorDelivery ? "あり" : "なし";

  const pickupAddressStr = `${pickupAddress.prefecture || ''}${pickupAddress.city || ''}${pickupAddress.town || ''}`;
  const deliveryAddressStr = `${deliveryAddress.prefecture || ''}${deliveryAddress.city || ''}${deliveryAddress.town || ''}`;

  const totalFee = estimate.totalFee || estimate.total_fee || 0;

  const subject = `【ハコボウ】概算見積通知（ID: ${estimate.id}）`;
  const text = `━━━━━━━━━━━━━━━━━━━━━━
新規見積もりのお知らせ
━━━━━━━━━━━━━━━━━━━━━━

以下の内容で見積もりが作成されました。

■ 見積もりID: ${estimate.id}
■ 見積もり金額: ¥${(totalFee).toLocaleString()}

【集荷先】
${pickupAddressStr}
${conditions.floorPickup || 1}階 / エレベーター：${elevatorPickup}

【お届け先】
${deliveryAddressStr}
${conditions.floorDelivery || 1}階 / エレベーター：${elevatorDelivery}

【日程】
集荷日: ${dates.pickupDate || '未設定'}
お届け日: ${dates.deliveryDate || '未設定'}

【プラン】
${planName} / 梱包サービス：${packingService}

━━━━━━━━━━━━━━━━━━━━━━
管理画面で確認:
https://mitsumori.hakobou.com/admin
━━━━━━━━━━━━━━━━━━━━━━`;

  try {
    await resend.emails.send({ from: "ハコボウ通知 <onboarding@resend.dev>", to: notificationEmail, subject: subject, text: text });
    console.log("メール通知を送信しました:", estimate.id);
  } catch (error) {
    console.error("メール通知の送信に失敗しました:", error);
  }
}

/**
 * 申込確定時のメール通知
 */
async function sendApplicationNotification(estimate, application) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !resend) {
    console.log("メール通知設定がありません。スキップします。");
    return;
  }

  const fullName = `${application.lastName || ''} ${application.firstName || ''}`.trim() || '未入力';
  const fullNameKana = `${application.lastNameKana || ''} ${application.firstNameKana || ''}`.trim() || '未入力';

  const pickupFull = [
    estimate.pickup_prefecture,
    estimate.pickup_city,
    estimate.pickup_town,
    application.pickupAddressDetail,
    application.pickupBuilding
  ].filter(Boolean).join('') || '未入力';

  const deliveryFull = [
    estimate.delivery_prefecture,
    estimate.delivery_city,
    estimate.delivery_town,
    application.deliveryAddressDetail,
    application.deliveryBuilding
  ].filter(Boolean).join('') || '未入力';

  const pickupDate = estimate.pickup_date || '未設定';
  const deliveryDate = estimate.delivery_date || '未設定';

  const floorPickup = estimate.floor_pickup || 1;
  const elevatorPickup = estimate.has_elevator_pickup ? "あり" : "なし";
  const floorDelivery = estimate.floor_delivery || 1;
  const elevatorDelivery = estimate.has_elevator_delivery ? "あり" : "なし";

  const planName = estimate.plan === "helper" ? "ヘルパープラン" : estimate.plan === "omakase" ? "お任せプラン" : "未選択";
  const packingService = estimate.needs_packing ? "希望する" : "希望しない";

  // 時間帯の日本語変換
  const timeSlotLabels = {
    'anytime': 'どちらでも',
    'morning': '午前',
    'afternoon': '午後',
    '': '指定なし'
  };
  const pickupTimeSlot = timeSlotLabels[application.pickupTimeSlot] || application.pickupTimeSlot || '指定なし';
  const deliveryTimeSlot = timeSlotLabels[application.deliveryTimeSlot] || application.deliveryTimeSlot || '指定なし';

  const subject = `【ハコボウ】日程調整の申込依頼（ID: ${estimate.id}）`;
  const text = `━━━━━━━━━━━━━━━━━━━━━━
🎉 日程調整申込のお知らせ
━━━━━━━━━━━━━━━━━━━━━━

以下の内容で申込がありました。

■ 見積もりID: ${estimate.id}
■ 見積もり金額: ¥${(estimate.total_fee || 0).toLocaleString()}

【お客様情報】
お名前: ${fullName}
フリガナ: ${fullNameKana}
電話番号: ${application.phone || '未入力'}

【集荷】
住所: ${pickupFull}
階数: ${floorPickup}階
エレベーター: ${elevatorPickup}
集荷日: ${pickupDate}
希望時間帯: ${pickupTimeSlot}

【お届け】
住所: ${deliveryFull}
階数: ${floorDelivery}階
エレベーター: ${elevatorDelivery}
お届け日: ${deliveryDate}
希望時間帯: ${deliveryTimeSlot}

【プラン】
${planName} / 梱包サービス：${packingService}

【備考】
${application.notes || 'なし'}

━━━━━━━━━━━━━━━━━━━━━━
管理者は日程調整後にユーザーに決済案内を送信して下さい。
━━━━━━━━━━━━━━━━━━━━━━

管理画面で確認:
https://mitsumori.hakobou.com/admin
`;

  try {
    await resend.emails.send({ from: "ハコボウ通知 <onboarding@resend.dev>", to: notificationEmail, subject: subject, text: text });
    console.log("申込通知メールを送信しました:", estimate.id);
  } catch (error) {
    console.error("申込通知メールの送信に失敗しました:", error);
  }
}


// __dirname の代替（ESM用）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // CORS許可
app.use(cookieParser()); // Cookie解析

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
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

// ========= API (JSON) =========
app.use("/api", express.json());

// 見積もり作成（async対応）- メール通知はLINE連携時に送信
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

    // メール通知を送信（バックグラウンド）
    sendEstimateNotification(estimate).catch(err => {
      console.error("メール通知エラー:", err);
    });

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

// 申込データ作成（estimatesテーブルを更新）
app.post("/api/apply", async (req, res) => {
  try {
    const {
      estimateId,
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      pickupAddressDetail,
      pickupBuilding,
      deliveryAddressDetail,
      deliveryBuilding,
      phone,
      pickupTimeSlot,
      deliveryTimeSlot,
      notes,
    } = req.body || {};

    if (!estimateId) {
      return res.status(400).json({
        success: false,
        error: "estimateId is required",
      });
    }

    // 見積もりが存在するか確認
    const estimate = await getEstimateById(estimateId);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: "Estimate not found",
      });
    }

    // 見積もりに申込情報を追加（UPDATE）
    const updatedEstimate = await updateEstimateWithApplication(estimateId, {
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      pickupAddressDetail,
      pickupBuilding,
      deliveryAddressDetail,
      deliveryBuilding,
      phone,
      pickupTimeSlot,
      deliveryTimeSlot,
      notes,
    });

    // 申込通知メールを送信（バックグラウンド）
    sendApplicationNotification(estimate, {
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      pickupAddressDetail,
      pickupBuilding,
      deliveryAddressDetail,
      deliveryBuilding,
      phone,
      pickupTimeSlot,
      deliveryTimeSlot,
      notes,
    }).catch(err => {
      console.error("申込通知メールエラー:", err);
    });

    res.json({ success: true, estimateId: updatedEstimate.id });
  } catch (error) {
    console.error("Error updating estimate with application:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
});

// ========= 管理画面API =========
app.use("/api/admin", adminRoutes);
app.use("/api/coupons", couponRoutes);

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

  // postbackイベント：「相談する」ボタン押下時
  if (t === "postback") {
    return handlePostbackEvent(event);
  }

  console.log("-> route: ignore");
  return null;
}

// postbackイベント処理（相談するボタン）
async function handlePostbackEvent(event) {
  if (!client) {
    console.log("LINE client not configured");
    return null;
  }

  const data = event.postback?.data || "";
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const estimateId = params.get("estimateId");

  console.log("Postback received:", { action, estimateId });

  // 相談アクション
  if (action === "consult" && estimateId) {
    try {
      // 見積もりを取得
      const estimate = await getEstimateById(estimateId);

      // 見積もりが存在しない場合
      if (!estimate) {
        console.log("Estimate not found:", estimateId);
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: "申し訳ございません。\n\nこの見積もりは見つかりませんでした。\n新しくお見積もりを作成してください。\n\n▼ お見積もりはこちら\nhttps://mitsumori.hakobou.com/",
            },
          ],
        });
      }

      // 有効期限チェック（3日間）
      if (!isEstimateValid(estimate)) {
        console.log("Estimate expired:", estimateId, "created_at:", estimate.created_at);
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: "申し訳ございません。\n\nこの見積もりの有効期限（3日間）が過ぎております。\n\nお手数ですが、再度お見積もりを作成してください。\n\n▼ お見積もりはこちら\nhttps://mitsumori.hakobou.com/",
            },
          ],
        });
      }

      // ステータスを「相談中」に更新
      await updateEstimateToConsulting(estimateId);
      console.log("Updated estimate to consulting:", estimateId);

      // ユーザーへ返信
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "ご相談ありがとうございます！\n\n担当者より折り返しご連絡いたします。\nしばらくお待ちくださいませ。",
          },
        ],
      });
    } catch (error) {
      console.error("Error handling consult postback:", error);
      return null;
    }
  }

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
  // 申込みページに直接遷移（LIFFを経由しない）
  const baseUrl = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL;
  return `${baseUrl}/apply?estimateId=${estimateId}`;
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

  return [flex];
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

  // 階数・エレベーター情報
  const floorPickup = estimate.floor_pickup || 1;
  const hasElevatorPickup = estimate.has_elevator_pickup ? "あり" : "なし";
  const pickupCondition = `${floorPickup}階 / エレベーター：${hasElevatorPickup}`;

  const floorDelivery = estimate.floor_delivery || 1;
  const hasElevatorDelivery = estimate.has_elevator_delivery ? "あり" : "なし";
  const deliveryCondition = `${floorDelivery}階 / エレベーター：${hasElevatorDelivery}`;

  // プラン表示
  let planLabel = "未選択";
  if (estimate.plan === "helper") planLabel = "ヘルパープラン";
  else if (estimate.plan === "omakase") planLabel = "お任せプラン";

  // 梱包サービス
  const packingLabel = estimate.needs_packing ? "希望する" : "希望しない";

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
              // 集荷日
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
              // お届け日
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
              // 集荷先
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
                type: "text",
                text: `   ${pickupCondition}`,
                size: "xs",
                color: "#888888",
              },
              // お届け先
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
                type: "text",
                text: `   ${deliveryCondition}`,
                size: "xs",
                color: "#888888",
              },
              // セパレーター
              {
                type: "separator",
                margin: "md",
              },
              // プラン
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "📋 プラン",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: planLabel,
                    size: "sm",
                    color: "#111111",
                    align: "end",
                  },
                ],
              },
              // 梱包サービス
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "📦 梱包サービス",
                    size: "sm",
                    color: "#555555",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: packingLabel,
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
            type: "text",
            text: "上記内容でお間違いなければ、【このプランで相談する】を押してください。送信後、担当スタッフよりプランと日程確認のご連絡をいたします。",
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: "※この時点では予約は確定しませんのでご安心ください。",
            size: "xs",
            color: "#888888",
            wrap: true,
            margin: "sm",
          },
          {
            type: "button",
            style: "primary",
            height: "md",
            action: {
              type: "postback",
              label: "このプランで相談する",
              data: `action=consult&estimateId=${estimate.id}`,
              displayText: "このプランで相談したいです",
            },
            color: "#06C755",
            margin: "md",
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

// ========= 静的ファイル配信（フロントエンド）=========
// ビルドされたフロントエンドを配信
const distPath = path.resolve(__dirname, "..", "dist", "public");
app.use(express.static(distPath));

// SPA用：すべてのルートでindex.htmlを返す（APIルート以外）
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ========= START =========
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Webhook: /webhook`);
  console.log(`API: /api/estimates, /api/link, /api/estimates/:id, /api/apply`);
  console.log(`Static files: ${distPath}`);
  console.log(`LINE configured: ${isLineConfigured}`);
});
