/**
 * 支払い金額サマリーコンポーネント
 */

interface PaymentSummaryProps {
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    couponCode?: string | null;
}

export default function PaymentSummary({
    originalAmount,
    discountAmount,
    finalAmount,
    couponCode,
}: PaymentSummaryProps) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-gray-600">
                <span>見積もり金額</span>
                <span>¥{originalAmount.toLocaleString()}</span>
            </div>

            {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                    <span>
                        クーポン割引
                        {couponCode && <span className="text-xs ml-1">({couponCode})</span>}
                    </span>
                    <span>-¥{discountAmount.toLocaleString()}</span>
                </div>
            )}

            <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">合計</span>
                    <span className="font-bold text-2xl text-green-600">
                        ¥{finalAmount.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
