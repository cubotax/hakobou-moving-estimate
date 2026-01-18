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
    Mail,
    Clock,
    FileText,
    ChevronLeft,
    Check,
    Loader2,
    AlertCircle,
    Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_CONFIG } from '@/lib/config';
import type { EstimateSummary, ApplyFormData } from './types';

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

export default function Confirm() {
    const [, navigate] = useLocation();
    const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
    const [formData, setFormData] = useState<ApplyFormData | null>(null);
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
                        <div className="text-center py-4 mb-4 bg-white rounded-xl border-2 border-black">
                            <p className="text-sm text-gray-600 font-bold mb-1">お見積もり金額</p>
                            <p className="text-4xl font-black">{formatCurrency(estimate.totalFee)}</p>
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
                                {(formData.pickupBuilding || formData.pickupRoom) && (
                                    <p className="text-gray-600">
                                        {formData.pickupBuilding && <span>{formData.pickupBuilding}</span>}
                                        {formData.pickupBuilding && formData.pickupRoom && <span> </span>}
                                        {formData.pickupRoom && <span>{formData.pickupRoom}号室</span>}
                                    </p>
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
                                {(formData.deliveryBuilding || formData.deliveryRoom) && (
                                    <p className="text-gray-600">
                                        {formData.deliveryBuilding && <span>{formData.deliveryBuilding}</span>}
                                        {formData.deliveryBuilding && formData.deliveryRoom && <span> </span>}
                                        {formData.deliveryRoom && <span>{formData.deliveryRoom}号室</span>}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 連絡先 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-blue-500" />
                                ご連絡先
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                {formData.phone && (
                                    <p className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{formData.phone}</span>
                                    </p>
                                )}
                                {formData.email && (
                                    <p className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{formData.email}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 希望日時 */}
                        <div className="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-500" />
                                集荷のご希望日時
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="font-medium">第1希望: {formData.preferredDateTime1}</p>
                                {formData.preferredDateTime2 && (
                                    <p className="text-gray-600">第2希望: {formData.preferredDateTime2}</p>
                                )}
                                {formData.preferredDateTime3 && (
                                    <p className="text-gray-600">第3希望: {formData.preferredDateTime3}</p>
                                )}
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
