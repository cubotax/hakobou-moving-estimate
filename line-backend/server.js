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
  updateEstimateToPhotoDiagnosis,
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

// Stripe初期化
import Stripe from 'stripe';
console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;


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
  const activeStatuses = ['photo_diagnosis', 'consulting', 'applied', 'invite_sent', 'payment_sent', 'paid'];
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
async function sendEstimateNotification(estimate, notificationType = "新規見積もり") {
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

  const planName = estimate.plan === "helper" ? "ヘルパープラン" : estimate.plan === "full" ? "お任せプラン" : "未選択";
  const packingService = conditions.needsPacking ? "希望する" : "希望しない";
  const elevatorPickup = conditions.hasElevatorPickup ? "あり" : "なし";
  const elevatorDelivery = conditions.hasElevatorDelivery ? "あり" : "なし";

  const pickupAddressStr = `${pickupAddress.prefecture || ''}${pickupAddress.city || ''}${pickupAddress.town || ''}`;
  const deliveryAddressStr = `${deliveryAddress.prefecture || ''}${deliveryAddress.city || ''}${deliveryAddress.town || ''}`;

  const totalFee = estimate.totalFee || estimate.total_fee || 0;
  const distanceKm = estimate.distanceKm || estimate.distance_km || 0;

  // 日付フォーマット関数
  const formatDate = (dateStr) => {
    if (!dateStr) return '未設定';
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 料金内訳を生成（0円でない項目のみ）
  const feeBreakdownItems = [];
  const baseFee = estimate.base_fee || estimate.baseFee || 0;
  const planFee = estimate.plan_fee || estimate.planFee || 0;
  const packingFee = estimate.packing_fee || estimate.packingFee || 0;
  const timeSlotFee = estimate.time_slot_fee || estimate.timeSlotFee || 0;
  const weekendHolidayFee = estimate.weekend_holiday_fee || estimate.weekendHolidayFee || 0;
  const floorPickupFee = estimate.floor_pickup_fee || estimate.floorPickupFee || 0;
  const floorDeliveryFee = estimate.floor_delivery_fee || estimate.floorDeliveryFee || 0;
  const storageFee = estimate.storage_fee || estimate.storageFee || 0;
  const busySeasonFee = estimate.busy_season_fee || estimate.busySeasonFee || 0;
  const expresswayFee = estimate.expressway_fee || estimate.expresswayFee || 0;
  const distanceFee = estimate.distance_fee || estimate.distanceFee || 0;

  if (baseFee > 0) feeBreakdownItems.push(`  基本料金: ¥${baseFee.toLocaleString()}`);
  if (planFee > 0) feeBreakdownItems.push(`  お任せプラン: ¥${planFee.toLocaleString()}`);
  if (packingFee > 0) feeBreakdownItems.push(`  梱包サービス: ¥${packingFee.toLocaleString()}`);
  if (timeSlotFee > 0) feeBreakdownItems.push(`  時間指定: ¥${timeSlotFee.toLocaleString()}`);
  if (weekendHolidayFee > 0) feeBreakdownItems.push(`  土日祝加算: ¥${weekendHolidayFee.toLocaleString()}`);
  if (floorPickupFee > 0) feeBreakdownItems.push(`  集荷先階数料金: ¥${floorPickupFee.toLocaleString()}`);
  if (floorDeliveryFee > 0) feeBreakdownItems.push(`  届け先階数料金: ¥${floorDeliveryFee.toLocaleString()}`);
  if (storageFee > 0) feeBreakdownItems.push(`  積み置き料金: ¥${storageFee.toLocaleString()}`);
  if (busySeasonFee > 0) feeBreakdownItems.push(`  繁忙期加算: ¥${busySeasonFee.toLocaleString()}`);
  if (expresswayFee > 0) feeBreakdownItems.push(`  高速道路料金: ¥${expresswayFee.toLocaleString()}`);
  if (distanceFee > 0) feeBreakdownItems.push(`  距離超過料金: ¥${distanceFee.toLocaleString()}`);

  const breakdownText = feeBreakdownItems.length > 0
    ? feeBreakdownItems.join('\n')
    : '  （内訳情報なし）';

  const subject = `【ハコボウ】概算見積通知（ID: ${estimate.id}）`;
  const text = `━━━━━━━━━━━━━━━━━━━━━━
${notificationType}のお知らせ
━━━━━━━━━━━━━━━━━━━━━━

以下の内容で見積もりが作成されました。

■ 見積もりID: ${estimate.id}
■ 見積もり金額: ¥${totalFee.toLocaleString()}

■ 料金内訳
${breakdownText}

【集荷先】
${pickupAddressStr}
${conditions.floorPickup || 1}階 / エレベーター：${elevatorPickup}

【お届け先】
${deliveryAddressStr}
${conditions.floorDelivery || 1}階 / エレベーター：${elevatorDelivery}

【ルート】
距離: ${distanceKm}km

【日程】
集荷日: ${formatDate(dates.pickupDate)}
お届け日: ${formatDate(dates.deliveryDate)}

【プラン】
${planName} / 梱包サービス：${packingService}

━━━━━━━━━━━━━━━━━━━━━━
日程調整が完了したらお客様に申込案内を送信してください
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

// __dirname の代替（ESM用）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // CORS許可
app.use(cookieParser()); // Cookie解析
// 本番ドメインへのリダイレクト（SEO対策：重複コンテンツ防止）
app.use((req, res, next) => {
  const host = req.get('host');
  if (host === 'hakobou-mitsumori.fly.dev') {
    return res.redirect(301, `https://mitsumori.hakobou.com${req.originalUrl}`);
  }
  next();
});

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

// 見積もりとLINEユーザーの紐づけ + メッセージ送信 + 初回proposal作成
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

    // 初回proposal（LINE連携時のスナップショット）を作成
    try {
      const { getSupabase } = await import('./adminDb.js');
      const supabase = getSupabase();

      await supabase
        .from('estimate_proposals')
        .insert({
          id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          estimate_id: estimateId,
          proposal_number: 1,
          pickup_date: estimate.pickup_date,
          delivery_date: estimate.delivery_date,
          pickup_time_slot: estimate.pickup_time_slot || '',
          delivery_time_slot: estimate.delivery_time_slot || '',
          floor_pickup: estimate.floor_pickup ?? 1,
          has_elevator_pickup: estimate.has_elevator_pickup ?? false,
          floor_delivery: estimate.floor_delivery ?? 1,
          has_elevator_delivery: estimate.has_elevator_delivery ?? false,
          plan: estimate.plan || 'helper',
          needs_packing: estimate.needs_packing ?? false,
          total_fee: estimate.total_fee || 0,
          expressway_fee: estimate.expressway_fee || 0,
          base_fee: estimate.base_fee || 0,
          plan_fee: estimate.plan_fee || 0,
          packing_fee: estimate.packing_fee || 0,
          time_slot_fee: estimate.time_slot_fee || 0,
          weekend_holiday_fee: estimate.weekend_holiday_fee || 0,
          floor_pickup_fee: estimate.floor_pickup_fee || 0,
          floor_delivery_fee: estimate.floor_delivery_fee || 0,
          storage_fee: estimate.storage_fee || 0,
          busy_season_fee: estimate.busy_season_fee || 0,
          distance_fee: estimate.distance_fee || 0,
          // 住所情報
          pickup_prefecture: estimate.pickup_prefecture || '',
          pickup_city: estimate.pickup_city || '',
          pickup_town: estimate.pickup_town || '',
          pickup_address_detail: estimate.pickup_address_detail || '',
          pickup_building: estimate.pickup_building || '',
          delivery_prefecture: estimate.delivery_prefecture || '',
          delivery_city: estimate.delivery_city || '',
          delivery_town: estimate.delivery_town || '',
          delivery_address_detail: estimate.delivery_address_detail || '',
          delivery_building: estimate.delivery_building || '',
          // 顧客情報
          last_name: estimate.last_name || '',
          first_name: estimate.first_name || '',
          last_name_kana: estimate.last_name_kana || '',
          first_name_kana: estimate.first_name_kana || '',
          phone: estimate.phone || '',
          notes: estimate.notes || '',
          message: '',
          status: 'sent',
        });
      console.log("Initial proposal created for estimate:", estimateId);
    } catch (proposalError) {
      console.error("Error creating initial proposal:", proposalError);
      // proposalの作成に失敗してもLINE連携は続行
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

// 見積もりをメールで送信
app.post("/api/estimates/:id/send-email", async (req, res) => {
  try {
    const { email, phone } = req.body;
    const estimateId = req.params.id;

    if (!email) {
      return res.status(400).json({ success: false, error: "メールアドレスは必須です" });
    }

    const estimate = await getEstimateById(estimateId);
    if (!estimate) {
      return res.status(404).json({ success: false, error: "見積もりが見つかりません" });
    }

    const { getSupabase } = await import('./adminDb.js');
    const supabase = getSupabase();

    // 見積もりにメールアドレスと電話番号を保存
    await supabase
      .from("estimates")
      .update({
        email: email,
        phone: phone || null,
        email_sent_at: new Date().toISOString()
      })
      .eq("id", estimateId);

    // メール送信
    if (resend) {
      const estimateUrl = `https://mitsumori.hakobou.com/estimate/${estimateId}`;

      // 日付フォーマット関数
      const formatDate = (dateStr) => {
        if (!dateStr) return '未定';
        const date = new Date(dateStr);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      };

      // 料金内訳を生成（0円でない項目のみ）
      const feeBreakdownItems = [];
      if (estimate.base_fee > 0) feeBreakdownItems.push(`  基本料金: ¥${estimate.base_fee.toLocaleString()}`);
      if (estimate.plan_fee > 0) feeBreakdownItems.push(`  お任せプラン: ¥${estimate.plan_fee.toLocaleString()}`);
      if (estimate.packing_fee > 0) feeBreakdownItems.push(`  梱包サービス: ¥${estimate.packing_fee.toLocaleString()}`);
      if (estimate.time_slot_fee > 0) feeBreakdownItems.push(`  時間指定: ¥${estimate.time_slot_fee.toLocaleString()}`);
      if (estimate.weekend_holiday_fee > 0) feeBreakdownItems.push(`  土日祝加算: ¥${estimate.weekend_holiday_fee.toLocaleString()}`);
      if (estimate.floor_pickup_fee > 0) feeBreakdownItems.push(`  集荷先階数料金: ¥${estimate.floor_pickup_fee.toLocaleString()}`);
      if (estimate.floor_delivery_fee > 0) feeBreakdownItems.push(`  届け先階数料金: ¥${estimate.floor_delivery_fee.toLocaleString()}`);
      if (estimate.storage_fee > 0) feeBreakdownItems.push(`  積み置き料金: ¥${estimate.storage_fee.toLocaleString()}`);
      if (estimate.busy_season_fee > 0) feeBreakdownItems.push(`  繁忙期加算: ¥${estimate.busy_season_fee.toLocaleString()}`);
      if (estimate.expressway_fee > 0) feeBreakdownItems.push(`  高速道路料金: ¥${estimate.expressway_fee.toLocaleString()}`);
      if (estimate.distance_fee > 0) feeBreakdownItems.push(`  距離超過料金: ¥${estimate.distance_fee.toLocaleString()}`);

      const breakdownText = feeBreakdownItems.length > 0
        ? feeBreakdownItems.join('\n')
        : '  （内訳情報なし）';

      const distanceKm = estimate.distance_km || 0;
      const totalFee = estimate.total_fee || 0;

      await resend.emails.send({
        from: "ハコボウ見積もり <onboarding@resend.dev>",
        to: email,
        subject: `【ハコボウ】お見積もり内容のご案内`,
        text: `
お見積もりをご利用いただきありがとうございます。

■ お見積もり金額
${totalFee.toLocaleString()}円

■ 料金内訳
${breakdownText}

■ ルート
集荷先: ${estimate.pickup_prefecture || ''} ${estimate.pickup_city || ''} ${estimate.pickup_town || ''}
お届け先: ${estimate.delivery_prefecture || ''} ${estimate.delivery_city || ''} ${estimate.delivery_town || ''}
距離: ${distanceKm}km

■ 日程
集荷日: ${formatDate(estimate.pickup_date)}
お届け日: ${formatDate(estimate.delivery_date)}

▼ 見積もり詳細・お申込みはこちら
${estimateUrl}

ご不明な点がございましたら、LINEからもお気軽にご相談ください。
https://line.me/R/ti/p/@602epmvz

─────────────────
ハコボウ
─────────────────
`.trim(),
      });

      console.log(`見積もりメール送信完了: ${estimateId} -> ${email}`);
    }

    // 管理者にも通知
    await sendEstimateNotification(estimate, "メール見積もり送信");

    res.json({ success: true, message: "メールを送信しました" });
  } catch (error) {
    console.error("メール送信エラー:", error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

// 日程調整リクエスト
app.post("/api/estimates/:id/schedule-request", async (req, res) => {
  try {
    const estimateId = req.params.id;

    const estimate = await getEstimateById(estimateId);
    if (!estimate) {
      return res.status(404).json({ success: false, error: "見積もりが見つかりません" });
    }

    // ステータスを更新
    await supabase
      .from("estimates")
      .update({
        status: "schedule_requested",
        schedule_requested_at: new Date().toISOString()
      })
      .eq("id", estimateId);

    // 管理者に通知
    if (resend && notificationEmail) {
      await resend.emails.send({
        from: "ハコボウ通知 <onboarding@resend.dev>",
        to: notificationEmail,
        subject: `【日程調整リクエスト】${estimate.pickup_prefecture || ''} → ${estimate.delivery_prefecture || ''}`,
        text: `
日程調整のリクエストがありました。

■ 見積もりID: ${estimateId}

■ お客様情報
メール: ${estimate.email || '未登録'}
電話: ${estimate.phone || '未登録'}

■ 見積もり金額: ${estimate.total_fee?.toLocaleString() || estimate.totalFee?.toLocaleString()}円

■ ルート
集荷先: ${estimate.pickup_prefecture || ''} ${estimate.pickup_city || ''} ${estimate.pickup_town || ''}
お届け先: ${estimate.delivery_prefecture || ''} ${estimate.delivery_city || ''} ${estimate.delivery_town || ''}

■ 日程
集荷日: ${estimate.pickup_date || ''}
お届け日: ${estimate.delivery_date || ''}

お客様へのご連絡をお願いいたします。
`.trim(),
      });
    }

    console.log(`日程調整リクエスト: ${estimateId}`);

    res.json({ success: true, message: "リクエストを受け付けました" });
  } catch (error) {
    console.error("日程調整リクエストエラー:", error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
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
app.use("/api", couponRoutes);

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
            text: "ご相談ありがとうございます！\n\n日程を確認し、担当より折り返しご連絡いたします😊\n\n調整がつかない場合は、代替日程をご提案させていただきます✨\n\n返信まで今しばらくお待ちください！",
          },
        ],
      });
    } catch (error) {
      console.error("Error handling consult postback:", error);
      return null;
    }
  }
  // オンライン面談アクション
  if (action === "online_meeting" && estimateId) {
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

      // ステータスを「写真診断中」に更新
      await updateEstimateToPhotoDiagnosis(estimateId);
      console.log("Updated estimate to photo_diagnosis:", estimateId);

      // ユーザーへ返信
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "LINE写真診断のご要望ありがとうございます！\n\nこのトーク画面より引越しで運ぶ荷物が全てわかるように写真を送信して下さい。\n\n写真を確認後に担当者から折り返しご連絡いたします。",
          },
        ],
      });
    } catch (error) {
      console.error("Error handling online_meeting postback:", error);
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

  // 料金内訳（0円でない項目のみ表示）
  const feeBreakdownItems = [];

  if (estimate.base_fee > 0) {
    feeBreakdownItems.push({ label: '基本料金', value: estimate.base_fee });
  }
  if (estimate.plan_fee > 0) {
    feeBreakdownItems.push({ label: 'お任せプラン', value: estimate.plan_fee });
  }
  if (estimate.packing_fee > 0) {
    feeBreakdownItems.push({ label: '梱包サービス', value: estimate.packing_fee });
  }
  if (estimate.time_slot_fee > 0) {
    feeBreakdownItems.push({ label: '時間指定', value: estimate.time_slot_fee });
  }
  if (estimate.weekend_holiday_fee > 0) {
    feeBreakdownItems.push({ label: '土日祝加算', value: estimate.weekend_holiday_fee });
  }
  if (estimate.floor_pickup_fee > 0) {
    feeBreakdownItems.push({ label: '集荷先階数料金', value: estimate.floor_pickup_fee });
  }
  if (estimate.floor_delivery_fee > 0) {
    feeBreakdownItems.push({ label: '届け先階数料金', value: estimate.floor_delivery_fee });
  }
  if (estimate.storage_fee > 0) {
    feeBreakdownItems.push({ label: '積み置き料金', value: estimate.storage_fee });
  }
  if (estimate.busy_season_fee > 0) {
    feeBreakdownItems.push({ label: '繁忙期加算', value: estimate.busy_season_fee });
  }
  if (estimate.expressway_fee > 0) {
    feeBreakdownItems.push({ label: '高速道路料金', value: estimate.expressway_fee });
  }
  if (estimate.distance_fee > 0) {
    feeBreakdownItems.push({ label: '距離超過料金', value: estimate.distance_fee });
  }

  // 内訳のFlex要素を生成
  const feeBreakdownContents = feeBreakdownItems.length > 0 ? [
    {
      type: "separator",
      margin: "md",
    },
    {
      type: "text",
      text: "💰 料金内訳",
      size: "sm",
      color: "#555555",
      weight: "bold",
      margin: "md",
    },
    ...feeBreakdownItems.map(item => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: item.label,
          size: "xs",
          color: "#888888",
          flex: 2,
        },
        {
          type: "text",
          text: `¥${item.value.toLocaleString()}`,
          size: "xs",
          color: "#111111",
          align: "end",
          flex: 1,
        },
      ],
    })),
  ] : [];

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
              // 料金内訳（動的に追加）
              ...feeBreakdownContents,
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
              displayText: "このプランで相談したい",
            },
            color: "#06C755",
            margin: "md",
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "📷 LINE写真診断のご案内",
            size: "md",
            weight: "bold",
            color: "#333333",
            margin: "lg",
          },
          {
            type: "text",
            text: "現在のプランで荷物を積みきれるか不安な方は、LINEで写真を送るだけの【写真診断】をご利用ください。お部屋の状況から最適なプランをご案内します。",
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "sm",
          },
          {
            type: "button",
            style: "primary",
            height: "md",
            action: {
              type: "postback",
              label: "LINE写真診断を希望する",
              data: `action=online_meeting&estimateId=${estimate.id}`,
              displayText: "LINE写真診断を希望します",
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

// Stripe Webhook
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 決済完了イベント
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const estimateId = session.metadata?.estimateId;

    console.log("Payment completed for estimate:", estimateId);

    if (estimateId) {
      try {
        // ステータスを「paid」に更新
        await updateEstimateStatus(estimateId, 'paid');

        // 見積もり情報を取得
        const estimate = await getEstimateById(estimateId);

        if (estimate) {
          // LINE通知を送信
          if (estimate.line_user_id && client) {
            await client.pushMessage({
              to: estimate.line_user_id,
              messages: [{
                type: 'text',
                text: `お支払いありがとうございます！\n\n見積もりID: ${estimateId}\n金額: ¥${estimate.total_fee?.toLocaleString()}\n\nご予約が確定しました。当日よろしくお願いいたします。`
              }]
            });
          }

          // 管理者メール通知
          await sendPaymentNotification(estimate);
        }
      } catch (error) {
        console.error("Error processing payment:", error);
      }
    }
  }

  res.json({ received: true });
});

// 決済完了メール通知
async function sendPaymentNotification(estimate) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !resend) {
    console.log("メール通知設定がありません");
    return;
  }

  try {
    await resend.emails.send({
      from: 'ハコボウ見積もり <noreply@and-and-and.com>',
      to: notificationEmail,
      subject: `【決済完了】見積もりID: ${estimate.id}`,
      html: `
        <h2>決済が完了しました</h2>
        <p><strong>見積もりID:</strong> ${estimate.id}</p>
        <p><strong>金額:</strong> ¥${estimate.total_fee?.toLocaleString()}</p>
        <p><strong>集荷先:</strong> ${estimate.pickup_address}</p>
        <p><strong>お届け先:</strong> ${estimate.delivery_address}</p>
        <p><a href="https://mitsumori.hakobou.com/admin/estimates/${estimate.id}">管理画面で確認</a></p>
      `
    });
    console.log("決済完了メール送信成功");
  } catch (error) {
    console.error("決済完了メール送信エラー:", error);
  }
}

// ========= START =========
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Webhook: /webhook`);
  console.log(`API: /api/estimates, /api/link, /api/estimates/:id, /api/apply`);
  console.log(`Static files: ${distPath}`);
  console.log(`LINE configured: ${isLineConfigured}`);
});
