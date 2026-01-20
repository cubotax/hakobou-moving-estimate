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
    const [isComposing, setIsComposing] = useState(false);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await onApply();
        } finally {
            setIsApplying(false);
        }
    };

    // クーポンコード変更ハンドラ（IME対応）
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // IME入力中は加工せずそのまま設定
        if (isComposing) {
            onCodeChange(value);
            return;
        }

        // 確定後のみ大文字変換と英数字のみに制限
        const processed = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        onCodeChange(processed);
    };

    // IME変換確定時の処理
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        setIsComposing(false);
        // 変換確定時に加工を適用
        const target = e.target as HTMLInputElement;
        const processed = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        onCodeChange(processed);
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
                    onChange={handleCodeChange}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="クーポンコードを入力"
                    autoComplete="off"
                    autoCapitalize="characters"
                    inputMode="text"
                    className="flex-1 min-w-0 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-lg focus:border-yellow-400 focus:outline-none transition-colors"
                    disabled={loading || isApplying}
                />
                <button
                    onClick={handleApply}
                    disabled={!couponCode.trim() || loading || isApplying}
                    className="shrink-0 px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
