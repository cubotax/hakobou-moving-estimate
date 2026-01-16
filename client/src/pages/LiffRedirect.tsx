/**
 * LIFFリダイレクトページ
 * 
 * LINEアプリ内で開かれ、見積もり情報をトークに送信するページ
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

// LIFF SDK グローバル型宣言
declare const liff: {
    init: (config: { liffId: string }) => Promise<void>;
    isLoggedIn: () => boolean;
    login: (config?: { redirectUri?: string }) => void;
    getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
    isInClient: () => boolean;
    sendMessages: (messages: Array<{ type: string; text: string }>) => Promise<void>;
    closeWindow: () => void;
};

// LIFF ID
const LIFF_ID = '2008810460-IvjGbCbG';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hakobou-mitsumori.fly.dev';

// 日付をフォーマット（YYYY-MM-DD → YYYY年MM月DD日）
function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

type Status = 'loading' | 'sending' | 'success' | 'error';

interface EstimateData {
    id: string;
    pickup_prefecture?: string;
    pickup_city?: string;
    pickup_town?: string;
    floor_pickup?: number;
    has_elevator_pickup?: boolean;
    delivery_prefecture?: string;
    delivery_city?: string;
    delivery_town?: string;
    floor_delivery?: number;
    has_elevator_delivery?: boolean;
    pickup_date?: string;
    delivery_date?: string;
    needs_packing?: boolean;
    total_fee?: number;
}

export default function LiffRedirect() {
    const [status, setStatus] = useState<Status>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        initializeLiff();
    }, []);

    async function initializeLiff() {
        try {
            // URLパラメータからestimateIdを取得
            const urlParams = new URLSearchParams(window.location.search);
            const estimateId = urlParams.get('estimateId');

            if (!estimateId) {
                throw new Error('見積もりIDが見つかりません');
            }

            // LIFF初期化
            await liff.init({ liffId: LIFF_ID });

            // LINEログイン確認
            if (!liff.isLoggedIn()) {
                liff.login({ redirectUri: window.location.href });
                return;
            }

            // ユーザー情報取得
            const profile = await liff.getProfile();
            const lineUserId = profile.userId;

            setStatus('sending');

            // 見積もりデータ取得
            const estimateResponse = await fetch(`${API_BASE_URL}/api/estimates/${estimateId}`);
            const estimateResult = await estimateResponse.json();

            if (!estimateResult.success) {
                throw new Error('見積もりデータの取得に失敗しました');
            }

            const estimate: EstimateData = estimateResult.estimate;

            // メッセージ作成
            const message = buildEstimateMessage(estimate);

            // LINEにメッセージ送信
            if (liff.isInClient()) {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: message,
                    },
                ]);
            }

            // 見積もりとユーザーを紐づけ
            await fetch(`${API_BASE_URL}/api/link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estimateId, lineUserId }),
            });

            setStatus('success');

            // 3秒後にLIFFを閉じる
            setTimeout(() => {
                if (liff.isInClient()) {
                    liff.closeWindow();
                }
            }, 3000);
        } catch (error) {
            console.error('LIFF Error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'エラーが発生しました');
            setStatus('error');
        }
    }

    function buildEstimateMessage(estimate: EstimateData): string {
        const pickupAddress = `${estimate.pickup_prefecture || ''}${estimate.pickup_city || ''}${estimate.pickup_town || ''}`;
        const deliveryAddress = `${estimate.delivery_prefecture || ''}${estimate.delivery_city || ''}${estimate.delivery_town || ''}`;

        const feeNum = Number(estimate.total_fee);
        const totalFee = Number.isFinite(feeNum) ? `¥${feeNum.toLocaleString()}` : '---';

        const elevatorPickup = estimate.has_elevator_pickup ? 'あり' : 'なし';
        const elevatorDelivery = estimate.has_elevator_delivery ? 'あり' : 'なし';
        const packingService = estimate.needs_packing ? '希望する' : '希望しない';

        return (
            `【お見積もり内容】\n\n` +
            `■ 集荷先\n${pickupAddress}\n${estimate.floor_pickup || 1}階 / エレベーター：${elevatorPickup}\n\n` +
            `■ お届け先\n${deliveryAddress}\n${estimate.floor_delivery || 1}階 / エレベーター：${elevatorDelivery}\n\n` +
            `■ 引越し日程\n集荷日：${formatDate(estimate.pickup_date || '')}\nお届け日：${formatDate(estimate.delivery_date || '')}\n\n` +
            `■ オプション\n梱包サービス：${packingService}\n\n` +
            `■ お見積もり金額\n${totalFee}\n\n` +
            `ご不明点がございましたら、お気軽にメッセージをお送りください！`
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[oklch(0.95_0.05_240)] to-[oklch(0.92_0.08_240)] flex items-center justify-center p-6">
            <div className="pop-card p-8 max-w-sm w-full text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#00B900] animate-spin" />
                        <p className="text-xl font-black text-gray-800">読み込み中...</p>
                        <p className="text-sm text-gray-500 mt-2">LINEと連携しています</p>
                    </>
                )}

                {status === 'sending' && (
                    <>
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#00B900] animate-pulse" />
                        <p className="text-xl font-black text-gray-800">送信中...</p>
                        <p className="text-sm text-gray-500 mt-2">見積もり情報を送信しています</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-[#00B900]" />
                        <p className="text-xl font-black text-gray-800">送信完了！</p>
                        <p className="text-sm text-gray-500 mt-2">
                            トーク画面に見積もり情報を送信しました。
                            <br />
                            まもなくこの画面を閉じます...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                        <p className="text-xl font-black text-gray-800">エラー</p>
                        <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
                        <button
                            type="button"
                            onClick={() => {
                                if (liff.isInClient()) {
                                    liff.closeWindow();
                                } else {
                                    window.close();
                                }
                            }}
                            className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-colors"
                        >
                            閉じる
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
