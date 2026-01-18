/**
 * LIFFリダイレクトページ
 * 
 * LINEアプリ内で開かれ、見積もり情報をDBに保存してトークに送信するページ
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
    closeWindow: () => void;
};

// LIFF ID
const LIFF_ID = '2008810460-IvjGbCbG';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hakobou-mitsumori.fly.dev';

type Status = 'loading' | 'sending' | 'success' | 'error';

export default function LiffRedirect() {
    const [status, setStatus] = useState<Status>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        initializeLiff();
    }, []);

    async function initializeLiff() {
        try {
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

            // localStorage から見積もりデータを取得
            const step1Data = localStorage.getItem('step1Data');
            const step2Data = localStorage.getItem('step2Data');
            const estimateResult = localStorage.getItem('estimateResult');
            const distanceData = localStorage.getItem('distanceData');

            if (!step1Data || !step2Data || !estimateResult) {
                throw new Error('見積もりデータが見つかりません');
            }

            const step1 = JSON.parse(step1Data);
            const step2 = JSON.parse(step2Data);
            const result = JSON.parse(estimateResult);
            const distance = distanceData ? JSON.parse(distanceData) : null;

            setStatus('sending');

            // API URL 正規化
            const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            const endpoint = `${base}/api/estimates-with-line`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineUserId,
                    pickupAddress: step1.pickupAddress,
                    deliveryAddress: step1.deliveryAddress,
                    dates: step1.dates,
                    totalFee: result.totalFee,
                    distanceKm: distance?.distanceKm || result.distanceKm || 0,
                    conditions: {
                        floorPickup: step2.floorPickup,
                        hasElevatorPickup: step2.hasElevatorPickup,
                        floorDelivery: step2.floorDelivery,
                        hasElevatorDelivery: step2.hasElevatorDelivery,
                        needsPacking: step2.needsPacking,
                    },
                    plan: step2.plan,
                }),
            });

            const rawText = await response.text().catch(() => '');
            let apiResult: any = null;
            try {
                apiResult = rawText ? JSON.parse(rawText) : null;
            } catch {
                apiResult = null;
            }

            if (!response.ok) {
                const msg =
                    apiResult?.error ||
                    `APIエラーが発生しました（HTTP ${response.status}）` +
                    (rawText ? `: ${rawText}` : '');
                throw new Error(msg);
            }

            if (!apiResult?.success) {
                throw new Error(apiResult?.error || 'エラーが発生しました');
            }

            setStatus('success');

            // 2秒後にLIFFを閉じる
            setTimeout(() => {
                if (liff.isInClient()) {
                    liff.closeWindow();
                }
            }, 2000);
        } catch (error: any) {
            console.error('LIFF Error:', error);
            let message = error?.message || 'エラーが発生しました';
            setErrorMessage(message);
            setStatus('error');
        }
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
