/**
 * 申込フォーム - 確認画面
 * 
 * 概算見積サマリーと追加入力内容を確認し、申込を確定する
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
    MapPin,
    Truck,
    Calendar,
    Phone,
    Clock,
    FileText,
    ChevronLeft,
    Check,
    Loader2,
    AlertCircle,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_CONFIG } from '@/lib/config';
import PaymentSummary from '@/components/apply/PaymentSummary';
import type { EstimateSummary, ApplyFormData } from './types';
import { timeSlotLabels } from './types';
import type { AppliedCoupon } from '@/hooks/useCouponValidation';

// 日付フォーマット
function formatDate(dateStr: string): string {
    if (!dateStr) return '未定';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// 金額フォーマット
function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

// プラン名の表示
function getPlanLabel(plan?: string): string {
    if (!plan) return '未選択';
    if (plan === 'helper') return 'ヘルパープラン';
    if (plan === 'omakase') return 'お任せプラン';
    return plan;
}

export default function Confirm() {
    const [, navigate] = useLocation();
    const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
    const [formData, setFormData] = useState<ApplyFormData | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // sessionStorageからデータ取得
    useEffect(() => {
        const savedFormData = sessionStorage.getItem('applyFormData');
        const savedEstimate = sessionStorage.getItem('estimateSummary');

        if (!savedFormData || !savedEstimate) {
            navigate('/');
            return;
        }

        try {
            setFormData(JSON.parse(savedFormData));
            setEstimate(JSON.parse(savedEstimate));

            // クーポン情報も取得
            const savedCoupon = sessionStorage.getItem('appliedCoupon');
            if (savedCoupon) {
                setAppliedCoupon(JSON.parse(savedCoupon));
            }
        } catch {
            navigate('/');
        }
    }, [navigate]);

    // 申込確定
    const handleSubmit = async () => {
        if (!estimate || !formData) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/api/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estimateId: estimate.id,
                    ...formData,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || '申込に失敗しました');
            }

            // 成功時はsessionStorageをクリア
            sessionStorage.removeItem('applyFormData');
            sessionStorage.removeItem('estimateSummary');
            sessionStorage.removeItem('appliedCoupon');

            navigate('/apply/complete');
        } catch (err) {
            console.error('Error submitting application:', err);
            setError('申込の送信に失敗しました。ネットワーク接続をご確認のうえ、再度お試しください。');
            setSubmitting(false);
        }
    };

    // 戻る
    const handleGoBack = () => {
        navigate(`/apply?estimateId=${estimate?.id}`);
    };

    if (!estimate || !formData) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="container py-6 sm:py-10">
                {/* ヘッダー */}
                <header className="text-center mb-6">
                    <h1 className="text-3xl sm:text-4xl font-black text-black mb-2">
                        お申込み内容の確認
                    </h1>
                    <p className="text-gray-600 font-medium">
                        以下の内容でお申込みを確定します
                    </p>
                </header>

                {/* ステップインジケーター */}
                <div className="flex justify-center items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.75_0.2_145)] border-2 border-black flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">入力</span>
                    </div>
                    <div className="w-8 h-1 bg-[oklch(0.92_0.16_95)] rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.92_0.16_95)] border-2 border-black flex items-center justify-center font-bold">2</div>
                        <span className="text-sm font-bold">確認</span>
                    </div>
                    <div className="w-8 h-1 bg-gray-200 rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center font-bold text-gray-400">3</div>
                        <span className="text-sm font-medium text-gray-400">完了</span>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                    {/* エラー表示 */}
                    {error && (
                        <div className="pop-card bg-red-50 border-red-200 p-4">
                            <p className="text-red-600 font-medium flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </p>
                        </div>
                    )}

                    {/* 概算見積サマリー */}
                    <div className="pop-card bg-[oklch(0.92_0.16_95)] p-6">
                        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            概算見積のサマリー
                        </h2>

                        {/* 金額 */}
                        <div className="text-center py-4 mb-4 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm text-gray-600 font-bold mb-1">お見積もり金額</p>
                            <p className="text-4xl font-black">{formatCurrency(estimate.totalFee)}</p>
                        </div>

                        {/* 料金内訳 */}
                        <div className="bg-white/60 rounded-xl p-4 mb-4">
                            <div className="space-y-3">
                                {/* 基本料金 */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">基本料金</p>
                                        <p className="text-xs text-gray-500">30kmまで</p>
                                    </div>
                                    <p className="font-bold text-gray-800">¥ 19,800</p>
                                </div>
                                <div className="border-t border-dashed border-gray-300" />
                                {/* 距離加算料金 */}
                                {(estimate.distanceKm || 0) > 30 && (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">距離加算料金</p>
                                                <p className="text-xs text-gray-500">{estimate.distanceKm?.toFixed(1)}km（累進課金）</p>
                                            </div>
                                            <p className="font-bold text-gray-800">¥ {((estimate.totalFee || 0) - 19800).toLocaleString()}</p>
                                        </div>
                                        <div className="border-t border-dashed border-gray-300" />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 詳細情報 */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <MapPin className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">集荷先</p>
                                    <p>{estimate.pickupPrefecture}{estimate.pickupCity}{estimate.pickupTown}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Truck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">お届け先</p>
                                    <p>{estimate.deliveryPrefecture}{estimate.deliveryCity}{estimate.deliveryTown}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">日程</p>
                                    <p>集荷: {formatDate(estimate.pickupDate)}</p>
                                    <p>お届け: {formatDate(estimate.deliveryDate)}</p>
                                </div>
                            </div>
                            {/* プラン・梱包サービス */}
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Package className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">プラン・オプション</p>
                                    <p>プラン: {getPlanLabel(estimate.plan)}</p>
                                    <p>梱包サービス: {estimate.needsPacking ? '利用する' : '利用しない'}</p>
                                </div>
                            </div>
                        </div>

                        {/* クーポン・支払い金額 */}
                        {appliedCoupon && (
                            <div className="mt-6">
                                <h3 className="font-bold text-sm mb-3">クーポン</h3>
                                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 text-sm">
                                    <span className="font-bold text-green-700">{appliedCoupon.code}</span>
                                    <span className="ml-2 text-green-600">→ -¥{appliedCoupon.discountAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <h3 className="font-bold text-sm mb-3">お支払い金額</h3>
                            <PaymentSummary
                                originalAmount={estimate.totalFee}
                                discountAmount={appliedCoupon?.discountAmount || 0}
                                finalAmount={appliedCoupon?.finalAmount || estimate.totalFee}
                                couponCode={appliedCoupon?.code}
                            />
                        </div>
                    </div>

                    {/* 追加入力内容 */}
                    <div className="pop-card p-6">
                        <h2 className="text-xl font-black mb-6">ご入力いただいた情報</h2>

                        {/* 集荷先詳細 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-pink-500" />
                                集荷先の詳細住所
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="font-medium">
                                    {estimate.pickupPrefecture}{estimate.pickupCity}{estimate.pickupTown}
                                    <span className="text-[oklch(0.5_0.2_250)] font-bold"> {formData.pickupAddressDetail}</span>
                                </p>
                                {formData.pickupBuilding && (
                                    <p className="text-gray-600">{formData.pickupBuilding}</p>
                                )}
                            </div>
                        </div>

                        {/* お届け先詳細 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-green-500" />
                                お届け先の詳細住所
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="font-medium">
                                    {estimate.deliveryPrefecture}{estimate.deliveryCity}{estimate.deliveryTown}
                                    <span className="text-[oklch(0.5_0.2_250)] font-bold"> {formData.deliveryAddressDetail}</span>
                                </p>
                                {formData.deliveryBuilding && (
                                    <p className="text-gray-600">{formData.deliveryBuilding}</p>
                                )}
                            </div>
                        </div>

                        {/* 連絡先 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-blue-500" />
                                ご連絡先
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{formData.phone}</span>
                                </p>
                            </div>
                        </div>

                        {/* 希望時間帯 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-500" />
                                ご希望時間帯
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="font-medium">集荷: {timeSlotLabels[formData.pickupTimeSlot]}</p>
                                <p className="font-medium">お届け: {timeSlotLabels[formData.deliveryTimeSlot]}</p>
                            </div>
                        </div>

                        {/* 備考 */}
                        {formData.notes && (
                            <div>
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    備考
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="font-medium whitespace-pre-wrap">{formData.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ボタン */}
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="pop-button w-full h-14 text-lg font-black bg-[oklch(0.75_0.2_145)] hover:bg-[oklch(0.7_0.2_145)]"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    送信中...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    この内容で申込を確定する
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleGoBack}
                            disabled={submitting}
                            className="w-full h-12 border-2 border-gray-300 rounded-xl font-bold"
                        >
                            <ChevronLeft className="w-5 h-5 mr-2" />
                            入力画面に戻る
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
