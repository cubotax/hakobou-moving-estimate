/**
 * クーポン検証フック（認証不要・公開API）
 */

import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface AppliedCoupon {
    couponId: string;
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    discountAmount: number;
    originalAmount: number;
    finalAmount: number;
}

export function useCouponValidation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

    /**
     * クーポンを検証
     */
    const validateCoupon = useCallback(async (
        code: string,
        estimateId: string,
        lineUserId: string = ''
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    estimateId,
                    lineUserId,
                }),
            });

            const data = await response.json();

            if (!data.valid) {
                setError(data.error || 'クーポンの検証に失敗しました');
                setAppliedCoupon(null);
                return false;
            }

            setAppliedCoupon({
                couponId: data.couponId,
                code: data.code,
                discountType: data.discountType,
                discountValue: data.discountValue,
                discountAmount: data.discountAmount,
                originalAmount: data.originalAmount,
                finalAmount: data.finalAmount,
            });

            return true;
        } catch (err) {
            console.error('Coupon validation error:', err);
            setError('クーポンの検証中にエラーが発生しました');
            setAppliedCoupon(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * クーポンを取り消す
     */
    const removeCoupon = useCallback(() => {
        setAppliedCoupon(null);
        setError(null);
    }, []);

    /**
     * エラーをクリア
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        loading,
        error,
        appliedCoupon,
        validateCoupon,
        removeCoupon,
        clearError,
    };
}
