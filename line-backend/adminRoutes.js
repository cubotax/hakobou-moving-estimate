/**
 * 管理画面用APIルート
 */

import express from 'express';
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
    getEstimateMemos,
    addEstimateMemo,
    getMessageLogs,
    addMessageLog,
    getCouponsList,
    getCouponDetail,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponUsages,
    validateCoupon,
    recordCouponUsage,
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

        // Googleトークンを取得
        const tokens = await exchangeCodeForTokens(code);

        // ユーザー情報を取得
        const userInfo = await getGoogleUserInfo(tokens.access_token);

        // メールアドレスが許可されているか確認
        if (!isEmailAllowed(userInfo.email)) {
            return res.redirect('/admin/login?error=not_authorized');
        }

        // JWTトークンを生成
        const jwtToken = generateToken({
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
        });

        // フロントエンドにリダイレクト（トークン付き）
        res.redirect(`/admin?token=${jwtToken}`);
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
        const { finalFee, feeChangeReason } = req.body;

        if (finalFee === undefined) {
            return res.status(400).json({ success: false, error: 'Final fee is required' });
        }

        const estimate = await updateEstimateFee(req.params.id, { finalFee, feeChangeReason });
        res.json({ success: true, estimate });
    } catch (err) {
        console.error('Error updating fee:', err);
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
    const pickupDate = formatDateJP(estimate.pickup_date);
    const deliveryDate = formatDateJP(estimate.delivery_date);
    const baseUrl = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL;
    const applyUrl = `${baseUrl}/apply?estimateId=${estimate.id}`;

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
                    },
                    {
                        type: 'text',
                        text: feeText,
                        weight: 'bold',
                        size: '3xl',
                        color: '#1DB446',
                        margin: 'sm',
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
                                    { type: 'text', text: '集荷日', size: 'sm', color: '#555555', flex: 1 },
                                    { type: 'text', text: pickupDate, size: 'sm', color: '#111111', flex: 2, align: 'end' },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: 'お届け日', size: 'sm', color: '#555555', flex: 1 },
                                    { type: 'text', text: deliveryDate, size: 'sm', color: '#111111', flex: 2, align: 'end' },
                                ],
                            },
                        ],
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
 * 決済案内Flexメッセージを作成
 */
function buildPaymentFlexMessage(estimate) {
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
                    },
                    {
                        type: 'text',
                        text: feeText,
                        weight: 'bold',
                        size: '3xl',
                        color: '#1DB446',
                        margin: 'sm',
                    },
                    discountAmount > 0 ? {
                        type: 'text',
                        text: '（クーポン適用後）',
                        size: 'xs',
                        color: '#888888',
                        margin: 'sm',
                    } : null,
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        contents: [
                            {
                                type: 'text',
                                text: 'ご登録の電話番号宛にSMSで',
                                size: 'sm',
                                color: '#555555',
                                wrap: true,
                            },
                            {
                                type: 'text',
                                text: '決済リンクをお送りしました。',
                                size: 'sm',
                                color: '#555555',
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
                        ],
                    },
                ].filter(Boolean),
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

        // Flexメッセージを送信
        const message = buildInviteFlexMessage(estimate);
        await lineClient.pushMessage({
            to: estimate.line_user_id,
            messages: [message],
        });

        // ステータスを更新
        await updateEstimateStatus(req.params.id, 'invite_sent');

        // 送信履歴を追加
        await addMessageLog(req.params.id, 'invite', req.adminUser.email);

        res.json({ success: true, message: 'Invite sent successfully' });
    } catch (err) {
        console.error('Error sending invite:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 決済案内送信
 */
router.post('/estimates/:id/send-payment', authMiddleware, async (req, res) => {
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

        // Flexメッセージを送信
        const message = buildPaymentFlexMessage(estimate);
        await lineClient.pushMessage({
            to: estimate.line_user_id,
            messages: [message],
        });

        // ステータスを更新
        await updateEstimateStatus(req.params.id, 'payment_sent');

        // 送信履歴を追加
        await addMessageLog(req.params.id, 'payment', req.adminUser.email);

        // TODO: SMS送信処理（SMS_API_KEY等の設定が必要）

        res.json({ success: true, message: 'Payment request sent successfully' });
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

export default router;
