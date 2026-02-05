/**
 * メールから開く見積もり詳細ページ
 */

import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { API_CONFIG } from "@/lib/config";
import { formatCurrency, formatDistance } from "@/lib/pricing";
import {
    MapPin,
    Truck,
    Route,
    Receipt,
    Calendar,
    MessageCircle,
    CheckCircle,
    Phone,
    Mail,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// LIFF ID
const LIFF_ID = '2008810460-IvjGbCbG';

interface EstimateData {
    id: string;
    totalFee: number;
    distanceKm: number;
    pickupPrefecture: string;
    pickupCity: string;
    pickupTown: string;
    deliveryPrefecture: string;
    deliveryCity: string;
    deliveryTown: string;
    pickupDate: string;
    deliveryDate: string;
    plan: string;
    needsPacking: boolean;
    breakdown: Array<{ name: string; amount: number; note?: string }>;
    storageDays?: number;
    truckCount?: number;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function EstimateDetail() {
    const params = useParams<{ id: string }>();
    const [estimate, setEstimate] = useState<EstimateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const fetchEstimate = async () => {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/estimates/${params.id}`);
                if (!response.ok) {
                    throw new Error('見積もりが見つかりませんでした');
                }
                const data = await response.json();
                setEstimate(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : '読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchEstimate();
        }
    }, [params.id]);

    const handleLineConsult = () => {
        const url = `https://liff.line.me/${LIFF_ID}?estimateId=${params.id}`;
        window.location.href = url;
    };

    const handleScheduleRequest = async () => {
        setIsSubmitting(true);
        try {
            await fetch(`${API_CONFIG.BASE_URL}/api/estimates/${params.id}/schedule-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            setIsComplete(true);
        } catch (err) {
            console.error(err);
            alert('送信に失敗しました。もう一度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[oklch(0.98_0.01_90)]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto" />
                    <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error || !estimate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[oklch(0.98_0.01_90)] p-4">
                <div className="pop-card p-8 text-center max-w-md">
                    <p className="text-red-500 font-bold text-lg mb-4">{error || '見積もりが見つかりませんでした'}</p>
                    <a href="/" className="text-blue-500 underline font-medium">トップページへ戻る</a>
                </div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[oklch(0.98_0.01_90)] p-4">
                <div className="pop-card p-8 text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-4">リクエストを受け付けました</h2>
                    <p className="text-gray-600 font-medium mb-2">
                        担当者より<span className="font-bold">1〜2営業日以内</span>に
                    </p>
                    <p className="text-gray-600 font-medium mb-6">
                        メールまたはお電話にてご連絡いたします。
                    </p>
                    <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 mb-6">
                        <p className="text-sm text-blue-700 font-medium">
                            お急ぎの場合はLINEからもご連絡いただけます
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLineConsult}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00B900] hover:bg-[#009D00] text-white font-black rounded-xl border-[3px] border-black transition-colors"
                    >
                        <MessageCircle className="w-5 h-5" />
                        LINEで相談する
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[oklch(0.98_0.01_90)]">
            <div className="max-w-lg mx-auto p-4 space-y-6">
                {/* ヘッダー */}
                <div className="text-center pt-4">
                    <h1 className="text-2xl font-black">お見積もり内容</h1>
                    <p className="text-gray-500 text-sm mt-1">見積もりID: {estimate.id}</p>
                </div>

                {/* 見積もり金額 */}
                <div className="pop-card bg-[oklch(0.92_0.16_95)] p-6 text-center">
                    <p className="text-black/70 font-black mb-2">お見積もり金額</p>
                    <p className="text-4xl font-black text-black">
                        {formatCurrency(estimate.totalFee)}
                    </p>
                </div>

                {/* プラン情報 */}
                <div className="pop-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[oklch(0.6_0.15_240)] flex items-center justify-center border-2 border-black">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black">選択プラン</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <p className="font-black text-lg">
                            {estimate.plan === 'full' ? 'お任せプラン' : 'ヘルパープラン'}
                        </p>
                    </div>
                </div>

                {/* 日程情報 */}
                <div className="pop-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[oklch(0.7_0.15_200)] flex items-center justify-center border-2 border-black">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black">引越し日程</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                            <p className="text-xs text-gray-500 font-medium">集荷日</p>
                            <p className="font-bold">{formatDate(estimate.pickupDate)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                            <p className="text-xs text-gray-500 font-medium">お届け日</p>
                            <p className="font-bold">{formatDate(estimate.deliveryDate)}</p>
                        </div>
                    </div>
                </div>

                {/* ルート情報 */}
                <div className="pop-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[oklch(0.7_0.15_250)] flex items-center justify-center border-2 border-black">
                            <Route className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black">ルート</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-pink-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">集荷先</p>
                                <p className="font-bold">{estimate.pickupPrefecture} {estimate.pickupCity} {estimate.pickupTown}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <Truck className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">お届け先</p>
                                <p className="font-bold">{estimate.deliveryPrefecture} {estimate.deliveryCity} {estimate.deliveryTown}</p>
                            </div>
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">走行距離</span>
                        <span className="text-xl font-black">{formatDistance(estimate.distanceKm)}</span>
                    </div>
                </div>

                {/* 料金内訳 */}
                <div className="pop-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[oklch(0.8_0.18_60)] flex items-center justify-center border-2 border-black">
                            <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black">料金内訳</h3>
                    </div>
                    <div className="space-y-3">
                        {estimate.breakdown.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200 last:border-0">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-black">{formatCurrency(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 bg-[oklch(0.92_0.16_95)] rounded-xl border-2 border-black">
                        <div className="flex justify-between items-center">
                            <span className="font-black">合計</span>
                            <span className="text-2xl font-black">{formatCurrency(estimate.totalFee)}</span>
                        </div>
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="space-y-4 pb-8">
                    {/* 日程調整ボタン */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-black rounded-xl transform translate-x-[3px] translate-y-[3px]" />
                        <button
                            type="button"
                            onClick={() => setShowScheduleConfirm(true)}
                            className="relative w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black rounded-xl border-[3px] border-black transition-colors"
                        >
                            このプランで日程調整する
                        </button>
                    </div>

                    {/* LINE相談ボタン */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-black rounded-xl transform translate-x-[3px] translate-y-[3px]" />
                        <button
                            type="button"
                            onClick={handleLineConsult}
                            className="relative inline-flex items-center justify-center w-full gap-2 py-4 bg-[#00B900] hover:bg-[#009D00] text-white font-black rounded-xl border-[3px] border-black transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            LINEで相談する
                        </button>
                    </div>
                </div>
            </div>

            {/* 日程調整確認モーダル */}
            {showScheduleConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-xl font-black mb-4 text-center">日程調整のリクエスト</h3>
                        <p className="text-gray-600 text-center mb-6">
                            担当者より<span className="font-bold">1〜2営業日以内</span>にメールまたはお電話にてご連絡いたします。
                        </p>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleScheduleRequest}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black rounded-xl border-2 border-black transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? '送信中...' : 'リクエストを送信'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowScheduleConfirm(false)}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-2 border-gray-300 transition-colors"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
