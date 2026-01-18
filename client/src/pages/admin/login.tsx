/**
 * 管理画面ログイン画面
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLogin() {
    const { isAuthenticated, isLoading, login } = useAdminAuth();
    const [, setLocation] = useLocation();

    // URLパラメータからエラーを取得
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    // 認証済みの場合はダッシュボードにリダイレクト
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            setLocation('/admin');
        }
    }, [isLoading, isAuthenticated, setLocation]);

    const getErrorMessage = (errorCode: string | null) => {
        switch (errorCode) {
            case 'not_authorized':
                return 'このアカウントはアクセスが許可されていません';
            case 'auth_failed':
                return '認証に失敗しました。もう一度お試しください';
            case 'no_code':
                return '認証コードが取得できませんでした';
            default:
                return errorCode;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
                    {/* ロゴ */}
                    <div className="text-center mb-8">
                        <span className="text-6xl">🚚</span>
                        <h1 className="text-2xl font-bold mt-4">ハコボウ管理画面</h1>
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                            {getErrorMessage(error)}
                        </div>
                    )}

                    {/* ログインボタン */}
                    <button
                        onClick={login}
                        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-xl px-6 py-4 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Googleでログイン
                    </button>

                    {/* 説明文 */}
                    <p className="mt-6 text-center text-gray-500 text-sm">
                        許可されたアカウントのみ
                        <br />
                        アクセスできます
                    </p>
                </div>
            </div>
        </div>
    );
}
