/**
 * 申込フォーム - 完了画面
 * 
 * 申込完了メッセージと次のアクションへの導線を表示
 */

import { useLocation } from 'wouter';
import {
    PartyPopper,
    Sparkles,
    MessageCircle,
    Home,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// LIFF ID
const LIFF_ID = '2008810460-IvjGbCbG';

export default function Complete() {
    const [, navigate] = useLocation();

    const handleLineConsult = () => {
        window.location.href = `https://liff.line.me/${LIFF_ID}`;
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-white">
            <header className="bg-white border-b border-gray-200 py-3 px-4">
                <div className="max-w-2xl mx-auto flex justify-start px-4">
                    <img src="/logo-horizontal.png" alt="ハコボウ" className="h-10" />
                </div>
            </header>
            <div className="container py-6 sm:py-10">
                {/* ステップインジケーター */}
                <div className="flex justify-center items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.75_0.2_145)] border-2 border-black flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">入力</span>
                    </div>
                    <div className="w-8 h-1 bg-[oklch(0.75_0.2_145)] rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.75_0.2_145)] border-2 border-black flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">確認</span>
                    </div>
                    <div className="w-8 h-1 bg-[oklch(0.75_0.2_145)] rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.92_0.16_95)] border-2 border-black flex items-center justify-center font-bold">3</div>
                        <span className="text-sm font-bold">完了</span>
                    </div>
                </div>

                <div className="max-w-lg mx-auto">
                    {/* 完了メッセージ */}
                    <div className="pop-card bg-[oklch(0.92_0.16_95)] p-8 text-center relative overflow-hidden">
                        {/* 背景装飾 */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
                            <PartyPopper className="absolute top-[5%] left-[10%] w-12 h-12 -rotate-12" />
                            <PartyPopper
                                className="absolute top-[5%] right-[10%] w-12 h-12 rotate-12"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            <Sparkles className="absolute bottom-[10%] left-[15%] w-10 h-10 -rotate-12" />
                            <Sparkles
                                className="absolute bottom-[10%] right-[15%] w-10 h-10 rotate-12"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        </div>

                        <div className="relative z-10">
                            <div className="w-20 h-20 rounded-full bg-[oklch(0.75_0.2_145)] border-4 border-black mx-auto mb-6 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Check className="w-10 h-10 text-white" />
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-black text-black mb-4">
                                お申込み完了！
                            </h1>

                            <p className="text-gray-700 font-medium mb-6 leading-relaxed">
                                お申込みありがとうございます。<br />
                                担当者より折り返しご連絡いたします。<br />
                                しばらくお待ちください。
                            </p>

                            <div className="bg-white/80 rounded-xl p-4 mb-6">
                                <p className="text-sm text-gray-600 font-medium">
                                    ご不明点がございましたら、<br />
                                    LINEからお気軽にお問い合わせください。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ボタン */}
                    <div className="mt-8 flex flex-col gap-4">
                        <button
                            type="button"
                            onClick={handleLineConsult}
                            className="line-btn-pulse inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-[#00B900] hover:bg-[#009D00] text-white font-black text-lg rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
                        >
                            <MessageCircle className="w-6 h-6" />
                            LINEで問い合わせる
                        </button>

                        <Button
                            variant="outline"
                            onClick={handleGoHome}
                            className="w-full h-12 border-2 border-gray-300 rounded-xl font-bold"
                        >
                            <Home className="w-5 h-5 mr-2" />
                            トップへ戻る
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
