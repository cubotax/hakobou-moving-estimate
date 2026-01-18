/**
 * クーポン入力コンポーネント
 */

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface CouponInputProps {
    couponCode: string;
    onCodeChange: (code: string) => void;
    onApply: () => Promise<void>;
    onRemove: () => void;
    appliedCoupon: {
        code: string;
        discountType: 'fixed' | 'percentage';
        discountValue: number;
        discountAmount: number;
    } | null;
    error: string | null;
    loading?: boolean;
}

export default function CouponInput({
    couponCode,
    onCodeChange,
    onApply,
    onRemove,
    appliedCoupon,
    error,
    loading = false,
}: CouponInputProps) {
    const [isApplying, setIsApplying] = useState(false);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await onApply();
        } finally {
            setIsApplying(false);
        }
    };

    // クーポン適用済みの場合
    if (appliedCoupon) {
        return (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-700">{appliedCoupon.code}</span>
                    </div>
                    <button
                        onClick={onRemove}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        取消
                    </button>
                </div>
                <p className="mt-2 text-sm text-green-600">
                    ¥{appliedCoupon.discountAmount.toLocaleString()} OFF が適用されました
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                    placeholder="クーポンコードを入力"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-yellow-400 focus:outline-none transition-colors"
                    disabled={loading || isApplying}
                />
                <button
                    onClick={handleApply}
                    disabled={!couponCode.trim() || loading || isApplying}
                    className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    {isApplying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            確認中
                        </>
                    ) : (
                        '適用'
                    )}
                </button>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <X className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
