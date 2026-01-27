/**
 * 管理画面用APIルート
 */

import express from 'express';
import Stripe from 'stripe';
import { messagingApi } from '@line/bot-sdk';
import {
    authMiddleware,
    getGoogleAuthUrl,
    exchangeCodeForTokens,
    getGoogleUserInfo,
    isEmailAllowed,
    generateToken,
    isAuthConfigured,
} from './adminAuth.js';

import {
    getEstimatesList,
    getEstimateDetail,
    updateEstimateStatus,
    updateEstimateFee,
    updateEstimateAdjustment,
    getEstimateMemos,
    addEstimateMemo,
    updateEstimateMemo,
    deleteEstimateMemo,
    getMessageLogs,
    addMessageLog,
    getCouponsList,
    getCouponDetail,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponUsages,
    validateCoupon,
    updateEstimatePaymentSession,
    recordCouponUsage,
    getPricingSettings,
    updatePricingSettings,
    getSupabase,
    addActionLog,
    getActionLogs,
} from './adminDb.js';

const router = express.Router();

// LINE Messaging APIクライアント
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mitsumori.hakobou.com/';

let lineClient = null;
if (LINE_CHANNEL_ACCESS_TOKEN) {
    lineClient = new messagingApi.MessagingApiClient({
        channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
    });
}

// Stripeクライアント
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe client initialized');
}

// =====================================================
// 認証エンドポイント
// =====================================================

/**
 * Google認証開始
 */
router.get('/auth/google', (req, res) => {
    if (!isAuthConfigured()) {
        return res.status(500).json({
            success: false,
            error: 'Google OAuth not configured',
        });
    }

    const authUrl = getGoogleAuthUrl();
    res.redirect(authUrl);
});

/**
 * Google認証コールバック
 */
router.get('/auth/callback', async (req, res) => {
    try {
        const { code, error } = req.query;

        if (error) {
            return res.redirect('/admin/login?error=' + encodeURIComponent(error));
        }

        if (!code) {
            return res.redirect('/admin/login?error=no_code');
        }

        const tokens = await exchangeCodeForTokens(code);
        const userInfo = await getGoogleUserInfo(tokens.access_token);

        if (!isEmailAllowed(userInfo.email)) {
            return res.redirect('/admin/login?error=not_authorized');
        }

        const jwtToken = generateToken({
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
        });

        res.redirect(`/admin/login?token=${jwtToken}`);
    } catch (err) {
        console.error('Auth callback error:', err);
        res.redirect('/admin/login?error=auth_failed');
    }
});

/**
 * ログアウト
 */
router.post('/auth/logout', (req, res) => {
    res.json({ success: true });
});

/**
 * 現在のユーザー情報
 */
router.get('/auth/me', authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: req.adminUser,
    });
});

// =====================================================
// 見積もり管理エンドポイント
// =====================================================

/**
 * 見積もり一覧取得
 */
router.get('/estimates', authMiddleware, async (req, res) => {
    try {
        const { status, period, search, page, limit } = req.query;

        const result = await getEstimatesList({
            status,
            period,
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Error getting estimates:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 見積もり詳細取得
 */
router.get('/estimates/:id', authMiddleware, async (req, res) => {
    try {
        const estimate = await getEstimateDetail(req.params.id);

        if (!estimate) {
            return res.status(404).json({ success: false, error: 'Estimate not found' });
        }

        res.json({ success: true, estimate });
    } catch (err) {
        console.error('Error getting estimate:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 見積もりステータス更新
 */
router.put('/estimates/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        const estimate = await updateEstimateStatus(req.params.id, status);
        res.json({ success: true, estimate });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 見積もり金額更新
 */
router.put('/estimates/:id/fee', authMiddleware, async (req, res) => {
    try {
        const { finalFee, feeChangeReason, expresswayFee, feeBreakdown } = req.body;

        if (finalFee === undefined) {
            return res.status(400).json({ success: false, error: 'Final fee is required' });
        }

        const estimate = await updateEstimateFee(req.params.id, { finalFee, feeChangeReason, expresswayFee, feeBreakdown });
        await addActionLog(req.params.id, 'fee_changed', `金額を変更しました（${finalFee}円）${feeChangeReason ? '：' + feeChangeReason : ''}`);

        res.json({ success: true, estimate });
    } catch (err) {
        console.error('Error updating fee:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 見積もり調整値更新
 */
router.put('/estimates/:id/adjust', authMiddleware, async (req, res) => {
    try {
        const adjustmentData = req.body;
        const adjustedBy = req.user?.email || 'unknown';

        const estimate = await updateEstimateAdjustment(req.params.id, adjustmentData, adjustedBy);
        await addActionLog(req.params.id, 'adjustment_saved', '調整内容を保存しました');
        res.json({ success: true, estimate });
    } catch (err) {
        console.error('Error updating adjustment:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// メモエンドポイント
// =====================================================

/**
 * メモ一覧取得
 */
router.get('/estimates/:id/memos', authMiddleware, async (req, res) => {
    try {
        const memos = await getEstimateMemos(req.params.id);
        res.json({ success: true, memos });
    } catch (err) {
        console.error('Error getting memos:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * メモ追加
 */
router.post('/estimates/:id/memos', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const memo = await addEstimateMemo(
            req.params.id,
            content,
            req.adminUser.email
        );

        res.json({ success: true, memo });
    } catch (err) {
        console.error('Error adding memo:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


/**
 * メモ更新
 */
router.put('/estimates/:id/memos/:memoId', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const memo = await updateEstimateMemo(req.params.memoId, content);
        res.json({ success: true, memo });
    } catch (err) {
        console.error('Error updating memo:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * メモ削除
 */
router.delete('/estimates/:id/memos/:memoId', authMiddleware, async (req, res) => {
    try {
        await deleteEstimateMemo(req.params.memoId);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting memo:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// 送信履歴エンドポイント
// =====================================================

/**
 * 送信履歴取得
 */
router.get('/estimates/:id/logs', authMiddleware, async (req, res) => {
    try {
        const logs = await getMessageLogs(req.params.id);
        res.json({ success: true, logs });
    } catch (err) {
        console.error('Error getting logs:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// メッセージ送信エンドポイント
// =====================================================

/**
 * 日付をフォーマット
 */
function formatDateJP(dateStr) {
    if (!dateStr) return '未定';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '未定';
    return d.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * 申込案内Flexメッセージを作成
 */
function buildInviteFlexMessage(estimate) {
    const totalFee = estimate.final_fee || estimate.total_fee || 0;
    const feeText = `¥${totalFee.toLocaleString()}`;

    const pickupDateValue = estimate.adjusted_pickup_date || estimate.pickup_date;
    const deliveryDateValue = estimate.adjusted_delivery_date || estimate.delivery_date;
    const pickupDate = formatDateJP(pickupDateValue);
    const deliveryDate = formatDateJP(deliveryDateValue);

    const baseUrl = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL;
    const applyUrl = `${baseUrl}/apply?estimateId=${estimate.id}`;

    const pickupAddress = [
        estimate.pickup_prefecture,
        estimate.pickup_city,
        estimate.pickup_town,
    ].filter(Boolean).join('') || '未入力';

    const deliveryAddress = [
        estimate.delivery_prefecture,
        estimate.delivery_city,
        estimate.delivery_town,
    ].filter(Boolean).join('') || '未入力';

    const floorPickup = estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1;
    const hasElevatorPickupValue = estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup;
    const hasElevatorPickup = hasElevatorPickupValue ? 'あり' : 'なし';
    const pickupCondition = `${floorPickup}階 / エレベーター：${hasElevatorPickup}`;

    const floorDelivery = estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1;
    const hasElevatorDeliveryValue = estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery;
    const hasElevatorDelivery = hasElevatorDeliveryValue ? 'あり' : 'なし';
    const deliveryCondition = `${floorDelivery}階 / エレベーター：${hasElevatorDelivery}`;

    const planValue = estimate.adjusted_plan || estimate.plan;
    let planLabel = '未選択';
    if (planValue === 'helper') planLabel = 'ヘルパープラン';
    else if (planValue === 'omakase') planLabel = 'お任せプラン';

    const needsPackingValue = estimate.adjusted_needs_packing ?? estimate.needs_packing;
    const packingLabel = needsPackingValue ? '希望する' : '希望しない';

    return {
        type: 'flex',
        altText: '📋 日程調整が完了しました！',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '📋 日程調整が完了しました！',
                        weight: 'bold',
                        size: 'lg',
                        color: '#1DB446',
                    },
                ],
                backgroundColor: '#F5F5F5',
                paddingAll: '16px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'お見積もり金額',
                        size: 'sm',
                        color: '#555555',
                        align: 'center',
                    },
                    {
                        type: 'text',
                        text: feeText,
                        weight: 'bold',
                        size: '3xl',
                        color: '#1DB446',
                        margin: 'sm',
                        align: 'center',
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
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
                                    { type: 'text', text: '📅 集荷日', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: pickupDate, size: 'sm', color: '#111111', align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📅 お届け日', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: deliveryDate, size: 'sm', color: '#111111', align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📍 集荷先', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: pickupAddress, size: 'sm', color: '#111111', align: 'end', wrap: true, flex: 2 },
                                ],
                            },
                            {
                                type: 'text',
                                text: `   ${pickupCondition}`,
                                size: 'xs',
                                color: '#888888',
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '🏠 お届け先', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: deliveryAddress, size: 'sm', color: '#111111', align: 'end', wrap: true, flex: 2 },
                                ],
                            },
                            {
                                type: 'text',
                                text: `   ${deliveryCondition}`,
                                size: 'xs',
                                color: '#888888',
                            },
                            {
                                type: 'separator',
                                margin: 'md',
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'md',
                                contents: [
                                    { type: 'text', text: '📋 プラン', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: planLabel, size: 'sm', color: '#111111', align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📦 梱包サービス', size: 'sm', color: '#555555', flex: 0 },
                                    { type: 'text', text: packingLabel, size: 'sm', color: '#111111', align: 'end' },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'text',
                        text: '日程調整が完了しました！このメッセージから3日以内であれば現在の見積もりプランでお申込みが可能です。',
                        size: 'sm',
                        color: '#666666',
                        wrap: true,
                        margin: 'lg',
                    },
                ],
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
                            label: '正式なお申込みはこちら',
                            uri: applyUrl,
                        },
                        color: '#1DB446',
                    },
                    {
                        type: 'text',
                        text: '※ボタンを押して必要事項をご入力ください',
                        size: 'xs',
                        color: '#888888',
                        align: 'center',
                        margin: 'md',
                        wrap: true,
                    },
                ],
                paddingAll: '16px',
            },
        },
    };
}

/**
 * 決済案内Flexメッセージを作成（LINE経由で決済リンク付き）
 */
function buildPaymentFlexMessage(estimate, paymentUrl) {
    const finalFee = estimate.final_fee || estimate.total_fee || 0;
    const discountAmount = estimate.discount_amount || 0;
    const feeText = `¥${finalFee.toLocaleString()}`;

    return {
        type: 'flex',
        altText: '💳 決済のご案内',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '💳 決済のご案内',
                        weight: 'bold',
                        size: 'lg',
                        color: '#1DB446',
                    },
                ],
                backgroundColor: '#F5F5F5',
                paddingAll: '16px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'お支払い金額',
                        size: 'sm',
                        color: '#555555',
                        align: 'center',  // 追加
                    },
                    {
                        type: 'text',
                        text: feeText,
                        weight: 'bold',
                        size: '3xl',
                        color: '#1DB446',
                        margin: 'sm',
                        align: 'center',  // 追加
                    },
                    discountAmount > 0 ? {
                        type: 'text',
                        text: '（クーポン適用後）',
                        size: 'xs',
                        color: '#888888',
                        margin: 'sm',
                        align: 'center',  // 追加

                    } : null,
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'text',
                        text: '下のボタンからクレジットカードでお支払いください。',
                        size: 'sm',
                        color: '#555555',
                        margin: 'lg',
                        wrap: true,
                    },
                    {
                        type: 'text',
                        text: '24時間以内にお支払いください。',
                        size: 'sm',
                        color: '#111111',
                        weight: 'bold',
                        margin: 'md',
                        wrap: true,
                    },
                ].filter(Boolean),
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: 'お支払いはこちら',
                            uri: paymentUrl,
                        },
                        style: 'primary',
                        color: '#1DB446',
                        height: 'md',
                    },
                    {
                        type: 'text',
                        text: '※クレジットカード決済（Stripe）',
                        size: 'xs',
                        color: '#888888',
                        align: 'center',
                        margin: 'md',
                    },
                ],
                paddingAll: '16px',
            },
        },
    };
}

/**
 * 申込案内送信
 */
router.post('/estimates/:id/send-invite', authMiddleware, async (req, res) => {
    try {
        const estimate = await getEstimateDetail(req.params.id);

        if (!estimate) {
            return res.status(404).json({ success: false, error: 'Estimate not found' });
        }

        if (!estimate.line_user_id) {
            return res.status(400).json({ success: false, error: 'LINE user ID not found' });
        }

        if (!lineClient) {
            return res.status(500).json({ success: false, error: 'LINE client not configured' });
        }

        const message = buildInviteFlexMessage(estimate);
        await lineClient.pushMessage({
            to: estimate.line_user_id,
            messages: [message],
        });

        await updateEstimateStatus(req.params.id, 'invite_sent');
        await addMessageLog(req.params.id, 'invite', req.adminUser.email);

        await addActionLog(req.params.id, 'invite_sent', '申込案内をLINEに送信しました');

        res.json({ success: true, message: 'Invite sent successfully' });
    } catch (err) {
        console.error('Error sending invite:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 決済案内送信（LINE経由）
 */
router.post('/estimates/:id/send-payment', authMiddleware, async (req, res) => {
    try {
        const estimate = await getEstimateDetail(req.params.id);

        if (!estimate) {
            return res.status(404).json({ success: false, error: 'Estimate not found' });
        }

        if (!estimate.line_user_id) {
            return res.status(400).json({ success: false, error: 'LINE user IDが登録されていません' });
        }

        if (!stripe) {
            return res.status(500).json({ success: false, error: 'Stripe not configured' });
        }

        if (!lineClient) {
            return res.status(500).json({ success: false, error: 'LINE client not configured' });
        }

        const finalFee = estimate.final_fee || estimate.total_fee || 0;

        // Stripe Checkout Session作成
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: `引越し料金（見積もりID: ${estimate.id}）`,
                        },
                        unit_amount: Math.round(finalFee),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${APP_BASE_URL}payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_BASE_URL}payment/cancel`,
            metadata: {
                estimate_id: estimate.id,
                line_user_id: estimate.line_user_id || '',
            },
        });

        console.log(`Stripe Session作成: ${session.id}`);

        // DBにセッションIDを保存
        await updateEstimatePaymentSession(req.params.id, session.id);

        // LINEで決済リンク付きメッセージを送信
        const message = buildPaymentFlexMessage(estimate, session.url);
        await lineClient.pushMessage({
            to: estimate.line_user_id,
            messages: [message],
        });

        console.log('LINE決済案内送信成功');

        // ステータスを更新
        await updateEstimateStatus(req.params.id, 'payment_sent');

        // 送信履歴を追加
        await addMessageLog(req.params.id, 'payment', req.adminUser.email);

        await addActionLog(req.params.id, 'payment_sent', '決済案内をLINEに送信しました');

        res.json({ success: true, message: 'Payment request sent via LINE' });
    } catch (err) {
        console.error('Error sending payment:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// クーポン管理エンドポイント
// =====================================================

/**
 * クーポン一覧取得
 */
router.get('/coupons', authMiddleware, async (req, res) => {
    try {
        const coupons = await getCouponsList();
        res.json({ success: true, coupons });
    } catch (err) {
        console.error('Error getting coupons:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * クーポン詳細取得
 */
router.get('/coupons/:id', authMiddleware, async (req, res) => {
    try {
        const coupon = await getCouponDetail(req.params.id);

        if (!coupon) {
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }

        res.json({ success: true, coupon });
    } catch (err) {
        console.error('Error getting coupon:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * クーポン作成
 */
router.post('/coupons', authMiddleware, async (req, res) => {
    try {
        const coupon = await createCoupon(req.body);
        res.json({ success: true, coupon });
    } catch (err) {
        console.error('Error creating coupon:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * クーポン更新
 */
router.put('/coupons/:id', authMiddleware, async (req, res) => {
    try {
        const coupon = await updateCoupon(req.params.id, req.body);
        res.json({ success: true, coupon });
    } catch (err) {
        console.error('Error updating coupon:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * クーポン削除
 */
router.delete('/coupons/:id', authMiddleware, async (req, res) => {
    try {
        await deleteCoupon(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting coupon:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * クーポン利用履歴取得
 */
router.get('/coupons/:id/usages', authMiddleware, async (req, res) => {
    try {
        const usages = await getCouponUsages(req.params.id);
        res.json({ success: true, usages });
    } catch (err) {
        console.error('Error getting coupon usages:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// 料金設定エンドポイント
// =====================================================

/**
 * 料金設定取得
 */
router.get('/pricing-settings', authMiddleware, async (req, res) => {
    try {
        const settings = await getPricingSettings();
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error getting pricing settings:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 料金設定更新
 */
router.put('/pricing-settings', authMiddleware, async (req, res) => {
    try {
        await updatePricingSettings(req.body);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating pricing settings:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================
// 統計API
// ============================================

/**
 * 月別統計を取得
 * GET /api/admin/stats/monthly
 */
router.get('/stats/monthly', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();

        // 過去12ヶ月のデータを取得
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const { data: estimates, error } = await supabase
            .from('estimates')
            .select('id, created_at, line_user_id, browser_id, status')
            .gte('created_at', twelveMonthsAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching stats:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
        }

        // 月別に集計
        const monthlyStats = {};

        for (const estimate of estimates || []) {
            const date = new Date(estimate.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    month: monthKey,
                    totalEstimates: 0,
                    lineLinked: 0,
                    applied: 0,
                    uniqueBrowsers: new Set(),
                    uniqueLineUsers: new Set(),
                };
            }

            monthlyStats[monthKey].totalEstimates++;

            // ブラウザIDでユニークユーザーをカウント
            if (estimate.browser_id) {
                monthlyStats[monthKey].uniqueBrowsers.add(estimate.browser_id);
            }

            // LINE連携ユーザーをカウント
            if (estimate.line_user_id) {
                monthlyStats[monthKey].lineLinked++;
                monthlyStats[monthKey].uniqueLineUsers.add(estimate.line_user_id);
            }

            // 申込ステータスをカウント
            if (['applied', 'consulting', 'confirmed', 'completed'].includes(estimate.status)) {
                monthlyStats[monthKey].applied++;
            }
        }

        // 配列に変換してソート（Setをカウントに変換）
        const result = Object.values(monthlyStats).map(stat => ({
            month: stat.month,
            totalEstimates: stat.totalEstimates,
            uniqueUsers: stat.uniqueBrowsers.size,
            lineLinked: stat.lineLinked,
            uniqueLineUsers: stat.uniqueLineUsers.size,
            applied: stat.applied,
        })).sort((a, b) => a.month.localeCompare(b.month));

        res.json({ success: true, stats: result });
    } catch (err) {
        console.error('Error in monthly stats:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ========================================
// 提案（再見積もり）関連API
// ========================================

// 提案一覧を取得
router.get('/estimates/:id/proposals', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('estimate_proposals')
            .select('*')
            .eq('estimate_id', id)
            .order('proposal_number', { ascending: true });

        if (error) throw error;
        res.json({ success: true, proposals: data || [] });
    } catch (err) {
        console.error('Error fetching proposals:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 編集前のスナップショットを保存
router.post('/estimates/:id/snapshot', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabase();

        // 現在の見積もりデータを取得
        const { data: estimate, error: fetchError } = await supabase
            .from('estimates')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !estimate) {
            return res.status(404).json({ success: false, error: 'Estimate not found' });
        }

        // 現在のスナップショット数を取得
        const { data: existing } = await supabase
            .from('estimate_proposals')
            .select('proposal_number')
            .eq('estimate_id', id)
            .order('proposal_number', { ascending: false })
            .limit(1);

        const nextNumber = existing && existing.length > 0 ? existing[0].proposal_number + 1 : 1;

        // スナップショットを保存
        const { data, error } = await supabase
            .from('estimate_proposals')
            .insert({
                id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                estimate_id: id,
                proposal_number: nextNumber,
                pickup_date: estimate.adjusted_pickup_date || estimate.pickup_date,
                delivery_date: estimate.adjusted_delivery_date || estimate.delivery_date,
                pickup_time_slot: estimate.pickup_time_slot,
                delivery_time_slot: estimate.delivery_time_slot,
                floor_pickup: estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1,
                has_elevator_pickup: estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false,
                floor_delivery: estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1,
                has_elevator_delivery: estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false,
                plan: estimate.adjusted_plan || estimate.plan || 'helper',
                needs_packing: estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false,
                total_fee: estimate.final_fee || estimate.total_fee || 0,
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
                snapshot_type: 'edit_history',
                status: 'archived',
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, snapshot: data });
    } catch (err) {
        console.error('Error creating snapshot:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 新規提案を作成
router.post('/estimates/:id/proposals', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const proposalData = req.body;
        const supabase = getSupabase();

        // 現在の提案数を取得
        const { data: existing } = await supabase
            .from('estimate_proposals')
            .select('proposal_number')
            .eq('estimate_id', id)
            .order('proposal_number', { ascending: false })
            .limit(1);

        const nextNumber = existing && existing.length > 0 ? existing[0].proposal_number + 1 : 1;

        // 提案を作成
        const { data, error } = await supabase
            .from('estimate_proposals')
            .insert({
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                estimate_id: id,
                proposal_number: nextNumber,
                pickup_date: proposalData.pickupDate,
                delivery_date: proposalData.deliveryDate,
                pickup_time_slot: proposalData.pickupTimeSlot,
                delivery_time_slot: proposalData.deliveryTimeSlot,
                floor_pickup: proposalData.floorPickup,
                has_elevator_pickup: proposalData.hasElevatorPickup,
                floor_delivery: proposalData.floorDelivery,
                has_elevator_delivery: proposalData.hasElevatorDelivery,
                plan: proposalData.plan,
                needs_packing: proposalData.needsPacking,
                total_fee: proposalData.totalFee,
                expressway_fee: proposalData.expresswayFee || 0,
                message: proposalData.message || '',
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, proposal: data });
    } catch (err) {
        console.error('Error creating proposal:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 提案をLINEで送信
router.post('/estimates/:id/proposals/:proposalId/send', authMiddleware, async (req, res) => {
    try {
        const { id, proposalId } = req.params;
        const supabase = getSupabase();

        // 見積もりと提案を取得
        const { data: estimate } = await supabase
            .from('estimates')
            .select('*')
            .eq('id', id)
            .single();

        const { data: proposal } = await supabase
            .from('estimate_proposals')
            .select('*')
            .eq('id', proposalId)
            .single();

        if (!estimate || !proposal) {
            return res.status(404).json({ success: false, error: 'Not found' });
        }

        if (!estimate.line_user_id) {
            return res.status(400).json({ success: false, error: 'LINE未連携' });
        }

        // LINE Flex Messageを送信
        const feeBreakdownItems = [];
        if (proposal.base_fee > 0) feeBreakdownItems.push({ label: '基本料金', value: proposal.base_fee });
        if (proposal.plan_fee > 0) feeBreakdownItems.push({ label: 'お任せプラン', value: proposal.plan_fee });
        if (proposal.packing_fee > 0) feeBreakdownItems.push({ label: '梱包サービス', value: proposal.packing_fee });
        if (proposal.time_slot_fee > 0) feeBreakdownItems.push({ label: '時間指定', value: proposal.time_slot_fee });
        if (proposal.weekend_holiday_fee > 0) feeBreakdownItems.push({ label: '土日祝加算', value: proposal.weekend_holiday_fee });
        if (proposal.floor_pickup_fee > 0) feeBreakdownItems.push({ label: '集荷先階数料金', value: proposal.floor_pickup_fee });
        if (proposal.floor_delivery_fee > 0) feeBreakdownItems.push({ label: '届け先階数料金', value: proposal.floor_delivery_fee });
        if (proposal.storage_fee > 0) feeBreakdownItems.push({ label: '積み置き料金', value: proposal.storage_fee });
        if (proposal.busy_season_fee > 0) feeBreakdownItems.push({ label: '繁忙期加算', value: proposal.busy_season_fee });
        if (proposal.expressway_fee > 0) feeBreakdownItems.push({ label: '高速道路料金', value: proposal.expressway_fee });
        if (proposal.distance_fee > 0) feeBreakdownItems.push({ label: '距離超過料金', value: proposal.distance_fee });

        // 内訳のFlex要素
        const feeBreakdownContents = feeBreakdownItems.length > 0 ? [
            { type: 'separator', margin: 'md' },
            { type: 'text', text: '💰 料金内訳', size: 'sm', color: '#555555', weight: 'bold', margin: 'md' },
            ...feeBreakdownItems.map(item => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                    { type: 'text', text: item.label, size: 'xs', color: '#888888', flex: 2 },
                    { type: 'text', text: `¥${item.value.toLocaleString()}`, size: 'xs', color: '#111111', align: 'end', flex: 1 },
                ],
            })),
        ] : [];

        // 集荷先・お届け先の情報
        const pickupAddress = [estimate.pickup_prefecture, estimate.pickup_city, estimate.pickup_town].filter(Boolean).join('') || '未入力';
        const deliveryAddress = [estimate.delivery_prefecture, estimate.delivery_city, estimate.delivery_town].filter(Boolean).join('') || '未入力';
        const pickupCondition = `${proposal.floor_pickup || 1}階 / エレベーター：${proposal.has_elevator_pickup ? 'あり' : 'なし'}`;
        const deliveryCondition = `${proposal.floor_delivery || 1}階 / エレベーター：${proposal.has_elevator_delivery ? 'あり' : 'なし'}`;
        const planLabel = proposal.plan === 'full' ? 'お任せプラン' : 'ヘルパープラン';
        const packingLabel = proposal.needs_packing ? '希望する' : '希望しない';

        // 日付フォーマット
        const formatDateJP = (dateStr) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        };

        // LINE Flex Messageを送信
        const flexMessage = {
            type: 'flex',
            altText: '新プランのご案内',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '🚚 新プランのご案内',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff',
                        },
                    ],
                    backgroundColor: '#FF6B35',
                    paddingAll: 'lg',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '新しい引越しプランを作成しましたので、内容をご確認ください！',
                            size: 'sm',
                            wrap: true,
                            color: '#333333',
                        },
                        {
                            type: 'text',
                            text: `¥${proposal.total_fee.toLocaleString()}`,
                            weight: 'bold',
                            size: '3xl',
                            color: '#FF6B35',
                            align: 'center',
                            margin: 'lg',
                        },
                        { type: 'separator', margin: 'lg' },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            spacing: 'sm',
                            contents: [
                                // 集荷日
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '📅 集荷日', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: formatDateJP(proposal.pickup_date), size: 'sm', color: '#111111', align: 'end' },
                                    ],
                                },
                                // お届け日
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '📅 お届け日', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: formatDateJP(proposal.delivery_date), size: 'sm', color: '#111111', align: 'end' },
                                    ],
                                },
                                // 集荷先
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '📍 集荷先', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: pickupAddress, size: 'sm', color: '#111111', align: 'end', wrap: true, flex: 2 },
                                    ],
                                },
                                { type: 'text', text: `   ${pickupCondition}`, size: 'xs', color: '#888888' },
                                // お届け先
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '🏠 お届け先', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: deliveryAddress, size: 'sm', color: '#111111', align: 'end', wrap: true, flex: 2 },
                                    ],
                                },
                                { type: 'text', text: `   ${deliveryCondition}`, size: 'xs', color: '#888888' },
                                { type: 'separator', margin: 'md' },
                                // プラン
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    margin: 'md',
                                    contents: [
                                        { type: 'text', text: '📋 プラン', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: planLabel, size: 'sm', color: '#111111', align: 'end' },
                                    ],
                                },
                                // 梱包サービス
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '📦 梱包サービス', size: 'sm', color: '#555555', flex: 0 },
                                        { type: 'text', text: packingLabel, size: 'sm', color: '#111111', align: 'end' },
                                    ],
                                },
                                // 料金内訳
                                ...feeBreakdownContents,
                            ],
                        },
                        proposal.message ? {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            contents: [
                                { type: 'text', text: '💬 メッセージ', size: 'sm', color: '#555555', weight: 'bold' },
                                { type: 'text', text: proposal.message, size: 'sm', wrap: true, margin: 'sm' },
                            ],
                        } : null,
                    ].filter(Boolean),
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '上記内容でお間違いなければ、【この内容で申し込む】を押してください。担当スタッフより日程確認のご連絡をいたします。',
                            size: 'sm',
                            color: '#666666',
                            wrap: true,
                        },
                        {
                            type: 'text',
                            text: '※この時点では予約は確定しませんのでご安心ください。',
                            size: 'xs',
                            color: '#888888',
                            wrap: true,
                            margin: 'sm',
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#FF6B35',
                            margin: 'lg',
                            action: {
                                type: 'postback',
                                label: 'この内容で申し込む',
                                data: `action=accept_proposal&proposalId=${proposalId}&estimateId=${id}`,
                            },
                        },
                    ],
                    paddingAll: 'lg',
                },
            },
        };

        // LINE API呼び出し
        const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to: estimate.line_user_id,
                messages: [flexMessage],
            }),
        });

        if (!lineResponse.ok) {
            throw new Error('LINE送信エラー');
        }

        // 送信履歴を記録
        await supabase.from('message_logs').insert({
            id: `log_${Date.now()}`,
            estimate_id: id,
            message_type: 'proposal',
            details: `提案 #${proposal.proposal_number} を送信`,
            sent_at: new Date().toISOString(),
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error sending proposal:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ==================== アクション履歴 ====================

/**
 * アクション履歴取得
 */
router.get('/estimates/:id/action-logs', authMiddleware, async (req, res) => {
    try {
        const logs = await getActionLogs(req.params.id);
        res.json({ success: true, logs });
    } catch (err) {
        console.error('Error fetching action logs:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * アクション履歴追加
 */
router.post('/estimates/:id/action-logs', authMiddleware, async (req, res) => {
    try {
        const { actionType, description } = req.body;
        if (!actionType) {
            return res.status(400).json({ success: false, error: 'Action type is required' });
        }
        const log = await addActionLog(req.params.id, actionType, description);
        res.json({ success: true, log });
    } catch (err) {
        console.error('Error adding action log:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
