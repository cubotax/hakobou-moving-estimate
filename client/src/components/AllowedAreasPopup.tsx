/**
 * 集荷対応エリア一覧ポップアップコンポーネント
 * 
 * 2026/01/19 新規作成
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface AllowedAreasPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AllowedAreasPopup({ isOpen, onClose }: AllowedAreasPopupProps) {
    // ESCキーで閉じる
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // ポップアップ表示中は背景スクロールを無効化
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // オーバーレイクリックで閉じる
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999] p-4"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto relative shadow-2xl border-[3px] border-black animate-fade-in">
                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="閉じる"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* タイトル */}
                <h2 className="text-xl font-black mb-5 pb-3 border-b-[3px] border-[oklch(0.92_0.16_95)]">
                    集荷対応エリア一覧
                </h2>

                {/* 青森県 */}
                <div className="mb-6">
                    <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        青森県
                    </h3>

                    {/* 市 */}
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                            {['青森市', '弘前市', '黒石市', '五所川原市', 'つがる市', '平川市'].map((city) => (
                                <span
                                    key={city}
                                    className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
                                >
                                    {city}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 南津軽郡 */}
                    <div className="mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-600 mb-2">南津軽郡</h4>
                        <div className="flex flex-wrap gap-2">
                            {['藤崎町', '大鰐町', '田舎館村'].map((town) => (
                                <span
                                    key={town}
                                    className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
                                >
                                    {town}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 北津軽郡 */}
                    <div className="mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-600 mb-2">北津軽郡</h4>
                        <div className="flex flex-wrap gap-2">
                            {['板柳町', '鶴田町', '中泊町'].map((town) => (
                                <span
                                    key={town}
                                    className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
                                >
                                    {town}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 東津軽郡 */}
                    <div className="mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-600 mb-2">東津軽郡</h4>
                        <div className="flex flex-wrap gap-2">
                            {['平内町', '今別町', '蓬田村', '外ヶ浜町'].map((town) => (
                                <span
                                    key={town}
                                    className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
                                >
                                    {town}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 西津軽郡 */}
                    <div className="mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-600 mb-2">西津軽郡</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
                                鰺ヶ沢町
                            </span>
                        </div>
                    </div>

                    {/* 中津軽郡 */}
                    <div className="mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-600 mb-2">中津軽郡</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
                                西目屋村
                            </span>
                        </div>
                    </div>
                </div>

                {/* 秋田県 */}
                <div>
                    <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        秋田県
                    </h3>

                    {/* 市 */}
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
                                大館市
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
