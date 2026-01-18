/**
 * 申込フォーム - 入力画面
 * 
 * 概算見積データを引き継ぎ、不足情報のみを入力するフォーム
 */

import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import {
    MapPin,
    Truck,
    Calendar,
    Phone,
    Mail,
    Clock,
    FileText,
    ChevronRight,
    AlertCircle,
    Loader2,
    ArrowLeft,
    Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_CONFIG } from '@/lib/config';
import type { EstimateSummary, ApplyFormData, FormErrors } from './types';
import { initialFormData } from './types';

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

// 電話番号バリデーション
function isValidPhone(phone: string): boolean {
    if (!phone) return true; // 空の場合はtrue（他でチェック）
    const phoneRegex = /^[0-9\-]{10,14}$/;
    return phoneRegex.test(phone.replace(/[\s\u3000]/g, ''));
}

// メールバリデーション
function isValidEmail(email: string): boolean {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export default function ApplyForm() {
    const [, navigate] = useLocation();
    const searchString = useSearch();
    const params = new URLSearchParams(searchString);
    const estimateId = params.get('estimateId');

    const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<ApplyFormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});

    // 見積データ取得
    useEffect(() => {
        if (!estimateId) {
            setError('見積IDが指定されていません。概算見積ページから再度お進みください。');
            setLoading(false);
            return;
        }

        const fetchEstimate = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/estimates/${estimateId}`);
                const data = await res.json();

                if (!data.success || !data.estimate) {
                    setError('見積データが見つかりません。概算見積ページから再度お進みください。');
                    setLoading(false);
                    return;
                }

                const e = data.estimate;
                setEstimate({
                    id: e.id,
                    pickupPrefecture: e.pickup_prefecture || '',
                    pickupCity: e.pickup_city || '',
                    pickupTown: e.pickup_town || '',
                    deliveryPrefecture: e.delivery_prefecture || '',
                    deliveryCity: e.delivery_city || '',
                    deliveryTown: e.delivery_town || '',
                    pickupDate: e.pickup_date || '',
                    deliveryDate: e.delivery_date || '',
                    totalFee: e.total_fee || 0,
                    floorPickup: e.floor_pickup || 1,
                    hasElevatorPickup: e.has_elevator_pickup || false,
                    floorDelivery: e.floor_delivery || 1,
                    hasElevatorDelivery: e.has_elevator_delivery || false,
                    needsPacking: e.needs_packing || false,
                    plan: e.plan || '',
                });
                setLoading(false);
            } catch (err) {
                console.error('Error fetching estimate:', err);
                setError('データの取得に失敗しました。ネットワーク接続をご確認ください。');
                setLoading(false);
            }
        };

        fetchEstimate();
    }, [estimateId]);

    // フォーム入力ハンドラ
    const handleInputChange = (field: keyof ApplyFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // 入力時にエラーをクリア
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
        // 連絡先エラーをクリア
        if (field === 'phone' || field === 'email') {
            setErrors(prev => ({ ...prev, contact: undefined }));
        }
    };

    // バリデーション
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // 番地以降は必須
        if (!formData.pickupAddressDetail.trim()) {
            newErrors.pickupAddressDetail = '番地以降を入力してください';
        }
        if (!formData.deliveryAddressDetail.trim()) {
            newErrors.deliveryAddressDetail = '番地以降を入力してください';
        }

        // 連絡先は電話 or メールのどちらか必須
        if (!formData.phone.trim() && !formData.email.trim()) {
            newErrors.contact = '電話番号またはメールアドレスのどちらかを入力してください';
        }

        // 電話番号形式チェック
        if (formData.phone.trim() && !isValidPhone(formData.phone)) {
            newErrors.phone = '正しい電話番号を入力してください';
        }

        // メール形式チェック
        if (formData.email.trim() && !isValidEmail(formData.email)) {
            newErrors.email = '正しいメールアドレスを入力してください';
        }

        // 希望日時は最低1つ必須
        if (!formData.preferredDateTime1.trim()) {
            newErrors.preferredDateTime1 = '第1希望を入力してください';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 確認画面へ
    const handleSubmit = () => {
        if (!validate()) return;

        // sessionStorageにデータ保存して確認画面へ
        sessionStorage.setItem('applyFormData', JSON.stringify(formData));
        sessionStorage.setItem('estimateSummary', JSON.stringify(estimate));
        navigate('/apply/confirm');
    };

    // ローディング
    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">見積データを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    // エラー
    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container py-8 sm:py-12">
                    <div className="max-w-lg mx-auto text-center">
                        <div className="pop-card p-8">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-black mb-4">エラー</h1>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <Button
                                onClick={() => navigate('/')}
                                className="pop-button w-full h-14 text-base"
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

    return (
        <div className="min-h-screen bg-white">
            <div className="container py-6 sm:py-10">
                {/* ヘッダー */}
                <header className="text-center mb-6">
                    <h1 className="text-3xl sm:text-4xl font-black text-black mb-2">
                        お申込みフォーム
                    </h1>
                    <p className="text-gray-600 font-medium">
                        不足情報をご入力ください
                    </p>
                </header>

                {/* ステップインジケーター */}
                <div className="flex justify-center items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.92_0.16_95)] border-2 border-black flex items-center justify-center font-bold">1</div>
                        <span className="text-sm font-bold">入力</span>
                    </div>
                    <div className="w-8 h-1 bg-gray-200 rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center font-bold text-gray-400">2</div>
                        <span className="text-sm font-medium text-gray-400">確認</span>
                    </div>
                    <div className="w-8 h-1 bg-gray-200 rounded" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center font-bold text-gray-400">3</div>
                        <span className="text-sm font-medium text-gray-400">完了</span>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                    {/* 概算見積サマリー */}
                    <div className="pop-card bg-[oklch(0.92_0.16_95)] p-6">
                        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            概算見積のサマリー
                        </h2>

                        {/* 金額 */}
                        <div className="text-center py-4 mb-4 bg-white rounded-xl border-2 border-black">
                            <p className="text-sm text-gray-600 font-bold mb-1">お見積もり金額</p>
                            <p className="text-4xl font-black">{formatCurrency(estimate?.totalFee || 0)}</p>
                        </div>

                        {/* 詳細情報 */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <MapPin className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">集荷先</p>
                                    <p>{estimate?.pickupPrefecture}{estimate?.pickupCity}{estimate?.pickupTown}</p>
                                    <p className="text-gray-500">{estimate?.floorPickup}階 / エレベーター{estimate?.hasElevatorPickup ? 'あり' : 'なし'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Truck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">お届け先</p>
                                    <p>{estimate?.deliveryPrefecture}{estimate?.deliveryCity}{estimate?.deliveryTown}</p>
                                    <p className="text-gray-500">{estimate?.floorDelivery}階 / エレベーター{estimate?.hasElevatorDelivery ? 'あり' : 'なし'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">日程</p>
                                    <p>集荷: {formatDate(estimate?.pickupDate || '')}</p>
                                    <p>お届け: {formatDate(estimate?.deliveryDate || '')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 不足情報入力フォーム */}
                    <div className="pop-card p-6">
                        <h2 className="text-xl font-black mb-6">追加情報の入力</h2>

                        {/* 集荷先詳細 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-pink-500" />
                                </div>
                                集荷先の詳細住所
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                                {estimate?.pickupPrefecture}{estimate?.pickupCity}{estimate?.pickupTown} の続き
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">
                                        番地以降 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.pickupAddressDetail}
                                        onChange={(e) => handleInputChange('pickupAddressDetail', e.target.value)}
                                        placeholder="例: 1-2-3"
                                        className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors ${errors.pickupAddressDetail ? 'border-red-500' : 'border-gray-300 focus:border-black'
                                            }`}
                                    />
                                    {errors.pickupAddressDetail && (
                                        <p className="text-red-500 text-sm mt-1">{errors.pickupAddressDetail}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">建物名</label>
                                        <input
                                            type="text"
                                            value={formData.pickupBuilding}
                                            onChange={(e) => handleInputChange('pickupBuilding', e.target.value)}
                                            placeholder="例: ハイツ山田"
                                            className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">部屋番号</label>
                                        <input
                                            type="text"
                                            value={formData.pickupRoom}
                                            onChange={(e) => handleInputChange('pickupRoom', e.target.value)}
                                            placeholder="例: 101"
                                            className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* お届け先詳細 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Truck className="w-4 h-4 text-green-500" />
                                </div>
                                お届け先の詳細住所
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                                {estimate?.deliveryPrefecture}{estimate?.deliveryCity}{estimate?.deliveryTown} の続き
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">
                                        番地以降 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.deliveryAddressDetail}
                                        onChange={(e) => handleInputChange('deliveryAddressDetail', e.target.value)}
                                        placeholder="例: 4-5-6"
                                        className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors ${errors.deliveryAddressDetail ? 'border-red-500' : 'border-gray-300 focus:border-black'
                                            }`}
                                    />
                                    {errors.deliveryAddressDetail && (
                                        <p className="text-red-500 text-sm mt-1">{errors.deliveryAddressDetail}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">建物名</label>
                                        <input
                                            type="text"
                                            value={formData.deliveryBuilding}
                                            onChange={(e) => handleInputChange('deliveryBuilding', e.target.value)}
                                            placeholder="例: メゾン田中"
                                            className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">部屋番号</label>
                                        <input
                                            type="text"
                                            value={formData.deliveryRoom}
                                            onChange={(e) => handleInputChange('deliveryRoom', e.target.value)}
                                            placeholder="例: 202"
                                            className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 連絡先 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                </div>
                                ご連絡先
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">電話番号またはメールアドレスのどちらかを入力してください</p>

                            {errors.contact && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-4">
                                    <p className="text-red-600 text-sm font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.contact}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> 電話番号
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        placeholder="例: 090-1234-5678"
                                        className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors ${errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-black'
                                            }`}
                                    />
                                    {errors.phone && (
                                        <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> メールアドレス
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="例: example@email.com"
                                        className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors ${errors.email ? 'border-red-500' : 'border-gray-300 focus:border-black'
                                            }`}
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 希望日時 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                </div>
                                集荷のご希望日時
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">最低1つは入力してください</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">
                                        第1希望 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.preferredDateTime1}
                                        onChange={(e) => handleInputChange('preferredDateTime1', e.target.value)}
                                        placeholder="例: 1月20日 午前中"
                                        className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors ${errors.preferredDateTime1 ? 'border-red-500' : 'border-gray-300 focus:border-black'
                                            }`}
                                    />
                                    {errors.preferredDateTime1 && (
                                        <p className="text-red-500 text-sm mt-1">{errors.preferredDateTime1}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">第2希望</label>
                                    <input
                                        type="text"
                                        value={formData.preferredDateTime2}
                                        onChange={(e) => handleInputChange('preferredDateTime2', e.target.value)}
                                        placeholder="例: 1月21日 14時〜16時"
                                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">第3希望</label>
                                    <input
                                        type="text"
                                        value={formData.preferredDateTime3}
                                        onChange={(e) => handleInputChange('preferredDateTime3', e.target.value)}
                                        placeholder="例: 1月22日 終日可"
                                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 備考 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                </div>
                                備考（任意）
                            </h3>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="運搬時の注意事項や、ご要望などがあればご記入ください"
                                rows={4}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* ボタン */}
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={handleSubmit}
                            className="pop-button w-full h-14 text-lg font-black"
                        >
                            確認画面へ
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/result')}
                            className="w-full h-12 border-2 border-gray-300 rounded-xl font-bold"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            見積結果に戻る
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
