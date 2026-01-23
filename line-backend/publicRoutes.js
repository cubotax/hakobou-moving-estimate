/**
 * 公開APIルート（認証不要）
 * クーポン検証などのエンドポイント
 */

import express from 'express';
import { validateCoupon, getPricingSettings } from './adminDb.js';

const router = express.Router();

/**
 * クーポン検証
 * POST /api/coupons/validate
 * Request: { code: "WELCOME2026", estimateId: "xxx", lineUserId: "xxx" }
 * Response: { valid: true, discountType, discountValue, discountAmount, finalAmount }
 *        or { valid: false, error: "エラーメッセージ" }
 */
router.post('/validate', async (req, res) => {
    try {
        const { code, estimateId, lineUserId } = req.body;

        if (!code) {
            return res.status(400).json({
                valid: false,
                error: 'クーポンコードを入力してください'
            });
        }

        if (!estimateId) {
            return res.status(400).json({
                valid: false,
                error: '見積もりIDが必要です'
            });
        }

        const result = await validateCoupon(code, estimateId, lineUserId || '');
        res.json(result);
    } catch (err) {
        console.error('Error validating coupon:', err);
        res.status(500).json({
            valid: false,
            error: 'クーポンの検証中にエラーが発生しました'
        });
    }
});

/**
 * 料金設定取得（公開API）
 * GET /api/pricing
 * Response: { success: true, settings: { base_fee: "19800", ... } }
 */
router.get('/pricing', async (req, res) => {
    try {
        const settings = await getPricingSettings();
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error fetching pricing settings:', err);
        res.status(500).json({
            success: false,
            error: '料金設定の取得に失敗しました'
        });
    }
});

export default router;
