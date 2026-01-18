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
    Clock,
    FileText,
    ChevronRight,
    AlertCircle,
    Loader2,
    ArrowLeft,
    Home,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_CONFIG } from '@/lib/config';
import CouponInput from '@/components/apply/CouponInput';
import PaymentSummary from '@/components/apply/PaymentSummary';
import { useCouponValidation } from '@/hooks/useCouponValidation';
import type { EstimateSummary, ApplyFormData, FormErrors, TimeSlot } from './types';
import { initialFormData, timeSlotLabels } from './types';

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

// プラン名の表示
function getPlanLabel(plan?: string): string {
    if (!plan) return '未選択';
    if (plan === 'helper') return 'ヘルパープラン';
    if (plan === 'omakase') return 'お任せプラン';
    return plan;
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

    // クーポン
    const [couponCode, setCouponCode] = useState('');
    const {
        loading: couponLoading,
        error: couponError,
        appliedCoupon,
        validateCoupon,
        removeCoupon,
    } = useCouponValidation();

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
                    distanceKm: e.distance_km || 0,
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
    };

    // 時間帯選択ハンドラ
    const handleTimeSlotChange = (field: 'pickupTimeSlot' | 'deliveryTimeSlot', value: TimeSlot) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

        // 電話番号は必須
        if (!formData.phone.trim()) {
            newErrors.phone = '電話番号を入力してください';
        } else if (!isValidPhone(formData.phone)) {
            newErrors.phone = '正しい電話番号を入力してください';
        }

        // 希望時間帯は必須
        if (!formData.pickupTimeSlot) {
            newErrors.pickupTimeSlot = '集荷希望時間帯を選択してください';
        }
        if (!formData.deliveryTimeSlot) {
            newErrors.deliveryTimeSlot = 'お届け希望時間帯を選択してください';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // クーポン適用
    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !estimateId) return;
        await validateCoupon(couponCode, estimateId);
    };

    // クーポン取消
    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponCode('');
    };

    // 確認画面へ
    const handleSubmit = () => {
        if (!validate()) return;

        // sessionStorageにデータ保存して確認画面へ
        sessionStorage.setItem('applyFormData', JSON.stringify(formData));
        sessionStorage.setItem('estimateSummary', JSON.stringify(estimate));
        // クーポン情報も保存
        if (appliedCoupon) {
            sessionStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
        } else {
            sessionStorage.removeItem('appliedCoupon');
        }
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
                        <div className="text-center py-4 mb-4 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm text-gray-600 font-bold mb-1">お見積もり金額</p>
                            <p className="text-4xl font-black">{formatCurrency(estimate?.totalFee || 0)}</p>
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
                                {(estimate?.distanceKm || 0) > 30 && (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">距離加算料金</p>
                                                <p className="text-xs text-gray-500">{estimate?.distanceKm.toFixed(1)}km（累進課金）</p>
                                            </div>
                                            <p className="font-bold text-gray-800">¥ {((estimate?.totalFee || 0) - 19800).toLocaleString()}</p>
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
                            {/* プラン・梱包サービス */}
                            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                                <Package className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700">プラン・オプション</p>
                                    <p>プラン: {getPlanLabel(estimate?.plan)}</p>
                                    <p>梱包サービス: {estimate?.needsPacking ? '利用する' : '利用しない'}</p>
                                </div>
                            </div>
                        </div>

                        {/* クーポンコード */}
                        <div className="mt-6">
                            <h3 className="font-bold text-sm mb-3">クーポンコード</h3>
                            <CouponInput
                                couponCode={couponCode}
                                onCodeChange={setCouponCode}
                                onApply={handleApplyCoupon}
                                onRemove={handleRemoveCoupon}
                                appliedCoupon={appliedCoupon}
                                error={couponError}
                                loading={couponLoading}
                            />
                        </div>

                        {/* 支払い金額サマリー */}
                        <div className="mt-6">
                            <h3 className="font-bold text-sm mb-3">お支払い金額</h3>
                            <PaymentSummary
                                originalAmount={estimate?.totalFee || 0}
                                discountAmount={appliedCoupon?.discountAmount || 0}
                                finalAmount={appliedCoupon?.finalAmount || estimate?.totalFee || 0}
                                couponCode={appliedCoupon?.code}
                            />
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
                                <div>
                                    <label className="block text-sm font-bold mb-1">建物名・部屋番号</label>
                                    <input
                                        type="text"
                                        value={formData.pickupBuilding}
                                        onChange={(e) => handleInputChange('pickupBuilding', e.target.value)}
                                        placeholder="例: ハイツ山田 101"
                                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                    />
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
                                <div>
                                    <label className="block text-sm font-bold mb-1">建物名・部屋番号</label>
                                    <input
                                        type="text"
                                        value={formData.deliveryBuilding}
                                        onChange={(e) => handleInputChange('deliveryBuilding', e.target.value)}
                                        placeholder="例: メゾン田中 202"
                                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-xl font-medium focus:border-black transition-colors"
                                    />
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

                            <div>
                                <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> 電話番号 <span className="text-red-500">*</span>
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
                        </div>

                        {/* 集荷希望時間帯 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                </div>
                                集荷希望時間帯 <span className="text-red-500">*</span>
                            </h3>
                            <select
                                value={formData.pickupTimeSlot}
                                onChange={(e) => handleTimeSlotChange('pickupTimeSlot', e.target.value as TimeSlot)}
                                className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors bg-white ${errors.pickupTimeSlot ? 'border-red-500' : 'border-gray-300 focus:border-black'}`}
                            >
                                <option value="">{timeSlotLabels['']}</option>
                                <option value="morning">{timeSlotLabels.morning}</option>
                                <option value="afternoon">{timeSlotLabels.afternoon}</option>
                                <option value="anytime">{timeSlotLabels.anytime}</option>
                            </select>
                            {errors.pickupTimeSlot && (
                                <p className="text-red-500 text-sm mt-1">{errors.pickupTimeSlot}</p>
                            )}
                        </div>

                        {/* お届け希望時間帯 */}
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-teal-500" />
                                </div>
                                お届け希望時間帯 <span className="text-red-500">*</span>
                            </h3>
                            <select
                                value={formData.deliveryTimeSlot}
                                onChange={(e) => handleTimeSlotChange('deliveryTimeSlot', e.target.value as TimeSlot)}
                                className={`w-full h-12 px-4 border-2 rounded-xl font-medium transition-colors bg-white ${errors.deliveryTimeSlot ? 'border-red-500' : 'border-gray-300 focus:border-black'}`}
                            >
                                <option value="">{timeSlotLabels['']}</option>
                                <option value="morning">{timeSlotLabels.morning}</option>
                                <option value="afternoon">{timeSlotLabels.afternoon}</option>
                                <option value="anytime">{timeSlotLabels.anytime}</option>
                            </select>
                            {errors.deliveryTimeSlot && (
                                <p className="text-red-500 text-sm mt-1">{errors.deliveryTimeSlot}</p>
                            )}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
