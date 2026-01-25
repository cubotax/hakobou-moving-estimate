/**
 * LIFFリダイレクトページ
 * 
 * LINEアプリ内で開かれ、見積もり情報をトークに送信するページ
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

// LIFF ID
const LIFF_ID = '2008810460-IvjGbCbG';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hakobou-mitsumori.fly.dev';

type Status = 'loading' | 'sending' | 'success' | 'error';

export default function LiffRedirect() {
    const [status, setStatus] = useState<Status>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [debugInfo, setDebugInfo] = useState<string>('');

    useEffect(() => {
        initializeLiff();
    }, []);

    async function initializeLiff() {
        try {
            let debug = '';
            debug += `[1] Start initialization\n`;
            debug += `[2] window.liff: ${typeof window.liff}\n`;
            debug += `[3] URL: ${window.location.href}\n`;

            // LIFF SDKが読み込まれているか確認
            if (typeof window.liff === 'undefined') {
                throw new Error('LIFF SDKが読み込まれていません');
            }

            // URLパラメータからestimateIdを取得
            const urlParams = new URLSearchParams(window.location.search);
            let estimateId = urlParams.get('estimateId');
            debug += `[4] estimateId from URL: ${estimateId}\n`;

            // liff.stateからも確認（LIFFリダイレクト時）
            if (!estimateId) {
                const liffState = urlParams.get('liff.state');
                debug += `[5] liff.state: ${liffState}\n`;
                if (liffState) {
                    const stateParams = new URLSearchParams(liffState);
                    estimateId = stateParams.get('estimateId');
                    debug += `[6] estimateId from liff.state: ${estimateId}\n`;
                }
            }

            if (!estimateId) {
                setDebugInfo(debug);
                throw new Error('見積もりIDが見つかりません');
            }

            // LIFF初期化
            debug += `[7] Initializing LIFF with ID: ${LIFF_ID}\n`;
            await window.liff.init({ liffId: LIFF_ID });
            debug += `[8] LIFF initialized successfully\n`;

            // LINEログイン確認
            const isLoggedIn = window.liff.isLoggedIn();
            debug += `[9] isLoggedIn: ${isLoggedIn}\n`;

            if (!isLoggedIn) {
                debug += `[10] Redirecting to login\n`;
                setDebugInfo(debug);
                window.liff.login({ redirectUri: window.location.href });
                return;
            }

            // ユーザー情報取得
            debug += `[11] Getting profile\n`;
            const profile = await window.liff.getProfile();
            const lineUserId = profile.userId;
            debug += `[12] Got userId: ${lineUserId.substring(0, 10)}...\n`;

            setStatus('sending');

            // API URL 正規化（末尾スラッシュ対策）
            const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            const endpoint = `${base}/api/link`;
            debug += `[13] Calling API: ${endpoint}\n`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estimateId, lineUserId }),
            });

            debug += `[14] API response status: ${response.status}\n`;

            // 失敗時もできるだけ理由を拾う（JSONじゃない場合もある）
            const rawText = await response.text().catch(() => '');
            debug += `[15] API response: ${rawText.substring(0, 100)}\n`;

            let result: any = null;
            try {
                result = rawText ? JSON.parse(rawText) : null;
            } catch {
                result = null;
            }

            if (!response.ok) {
                const msg =
                    result?.error ||
                    `APIエラーが発生しました（HTTP ${response.status}）` +
                    (rawText ? `: ${rawText}` : '');
                setDebugInfo(debug);
                throw new Error(msg);
            }

            if (!result?.success) {
                setDebugInfo(debug);
                throw new Error(result?.error || 'エラーが発生しました');
            }

            debug += `[16] Success!\n`;
            setDebugInfo(debug);
            setStatus('success');

        } catch (error: any) {
            console.error('LIFF Error:', error);
            let message = 'エラーが発生しました';
            if (error?.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
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
                        </p>
                        <a
                            href="https://line.me/R/ti/p/@602epmvz"
                            className="mt-6 inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-[#00B900] hover:bg-[#009D00] text-white font-black rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <MessageCircle className="w-5 h-5" />
                            トーク画面を開く
                        </a>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                        <p className="text-xl font-black text-gray-800">エラー</p>
                        <p className="text-sm text-red-500 mt-2">{errorMessage}</p>

                        {/* デバッグ情報 */}
                        {debugInfo && (
                            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                                <p className="text-xs font-bold text-gray-600 mb-1">デバッグ情報:</p>
                                <pre className="text-xs text-gray-500 whitespace-pre-wrap break-all">
                                    {debugInfo}
                                </pre>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window.liff !== 'undefined' && window.liff.isInClient()) {
                                    window.liff.closeWindow();
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

// Window に liff を追加する型宣言
declare global {
    interface Window {
        liff: {
            init: (config: { liffId: string }) => Promise<void>;
            isLoggedIn: () => boolean;
            login: (config?: { redirectUri?: string }) => void;
            getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
            isInClient: () => boolean;
            closeWindow: () => void;
        };
    }
}
