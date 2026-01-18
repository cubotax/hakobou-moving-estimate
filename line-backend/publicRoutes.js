/**
 * 公開APIルート（認証不要）
 * クーポン検証などのエンドポイント
 */

import express from 'express';
import { validateCoupon } from './adminDb.js';

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

export default router;
