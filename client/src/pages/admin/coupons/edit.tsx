/**
 * 管理画面 - クーポン編集・新規作成ページ
 */

import { useState, useEffect } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useCoupons, Coupon } from '@/hooks/useAdminApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

// 入力フィールドコンポーネント
interface FieldProps {
    label: string;
    id: string;
    required?: boolean;
    children: React.ReactNode;
}

function Field({ label, id, required, children }: FieldProps) {
    return (
        <div className="mb-6">
            <label htmlFor={id} className="text-sm text-gray-600 mb-2 block">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

// 初期フォームデータ
const initialFormData = {
    code: '',
    discountType: 'fixed' as 'fixed' | 'percentage',
    discountValue: '',
    minAmount: '',
    periodType: 'always' as 'always' | 'period',
    startDate: '',
    endDate: '',
    usageLimit: '',
    oncePerUser: true,
    isActive: true,
};

function CouponEditPage() {
    const [matchNew] = useRoute('/admin/coupons/new');
    const [, params] = useRoute('/admin/coupons/:id/edit');
    const couponId = params?.id;
    const isNewMode = matchNew || !couponId;

    const [, navigate] = useLocation();
    const { getCoupon, createCoupon, updateCoupon, deleteCoupon, loading } = useCoupons();
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(!isNewMode);

    // 編集モード：既存データを取得
    useEffect(() => {
        const fetchData = async () => {
            if (isNewMode || !couponId) {
                setInitialLoading(false);
                return;
            }

            const coupon = await getCoupon(couponId);
            if (coupon) {
                setFormData({
                    code: coupon.code,
                    discountType: coupon.discount_type,
                    discountValue: coupon.discount_value.toString(),
                    minAmount: coupon.min_amount.toString(),
                    periodType: coupon.start_date || coupon.end_date ? 'period' : 'always',
                    startDate: coupon.start_date || '',
                    endDate: coupon.end_date || '',
                    usageLimit: coupon.usage_limit?.toString() || '',
                    oncePerUser: coupon.once_per_user,
                    isActive: coupon.is_active,
                });
            }
            setInitialLoading(false);
        };
        fetchData();
    }, [couponId, isNewMode]);

    // 保存処理
    const handleSubmit = async () => {
        if (!formData.code) {
            toast.error('クーポンコードを入力してください');
            return;
        }
        if (!formData.discountValue) {
            toast.error('割引値を入力してください');
            return;
        }
        if (!formData.minAmount) {
            toast.error('最低利用金額を入力してください');
            return;
        }

        const couponData = {
            code: formData.code.toUpperCase(),
            discountType: formData.discountType,
            discountValue: parseInt(formData.discountValue) || 0,
            minAmount: parseInt(formData.minAmount) || 0,
            startDate: formData.periodType === 'period' && formData.startDate ? formData.startDate : null,
            endDate: formData.periodType === 'period' && formData.endDate ? formData.endDate : null,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
            oncePerUser: formData.oncePerUser,
            isActive: formData.isActive,
        };

        let success = false;
        if (isNewMode) {
            const created = await createCoupon(couponData);
            success = !!created;
        } else if (couponId) {
            success = await updateCoupon(couponId, couponData);
        }

        if (success) {
            toast.success('保存しました');
            navigate('/admin/coupons');
        }
    };

    // 削除処理
    const handleDelete = async () => {
        if (!couponId || isNewMode) return;

        const confirmed = window.confirm('このクーポンを削除しますか？この操作は取り消せません。');
        if (!confirmed) return;

        const success = await deleteCoupon(couponId);
        if (success) {
            toast.success('削除しました');
            navigate('/admin/coupons');
        }
    };

    if (initialLoading) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="max-w-2xl mx-auto pb-12">
                    {/* 戻るリンク */}
                    <Link
                        href="/admin/coupons"
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft size={18} />
                        クーポン一覧に戻る
                    </Link>

                    {/* ページタイトル */}
                    <h1 className="text-2xl font-bold mb-6">
                        {isNewMode ? 'クーポンを作成' : 'クーポンを編集'}
                    </h1>

                    {/* フォーム */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        {/* クーポンコード */}
                        <Field label="クーポンコード" id="code" required>
                            <input
                                id="code"
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="WELCOME2026"
                                className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                            />
                        </Field>

                        {/* 割引タイプ */}
                        <Field label="割引タイプ" id="discountType" required>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="discountType"
                                        value="fixed"
                                        checked={formData.discountType === 'fixed'}
                                        onChange={() => setFormData({ ...formData, discountType: 'fixed' })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    定額割引（円）
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="discountType"
                                        value="percentage"
                                        checked={formData.discountType === 'percentage'}
                                        onChange={() => setFormData({ ...formData, discountType: 'percentage' })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    割合割引（%）
                                </label>
                            </div>
                        </Field>

                        {/* 割引値 */}
                        <Field label="割引値" id="discountValue" required>
                            <div className="flex items-center gap-2">
                                <input
                                    id="discountValue"
                                    type="number"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <span className="text-gray-500 whitespace-nowrap">
                                    {formData.discountType === 'fixed' ? '円' : '%'}
                                </span>
                            </div>
                        </Field>

                        {/* 最低利用金額 */}
                        <Field label="最低利用金額" id="minAmount" required>
                            <div className="flex items-center gap-2">
                                <input
                                    id="minAmount"
                                    type="number"
                                    value={formData.minAmount}
                                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <span className="text-gray-500 whitespace-nowrap">円以上で利用可能</span>
                            </div>
                        </Field>

                        {/* 有効期間タイプ */}
                        <Field label="有効期間" id="periodType" required>
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="periodType"
                                        value="always"
                                        checked={formData.periodType === 'always'}
                                        onChange={() => setFormData({ ...formData, periodType: 'always' })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    常時有効
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="periodType"
                                        value="period"
                                        checked={formData.periodType === 'period'}
                                        onChange={() => setFormData({ ...formData, periodType: 'period' })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    期間を設定
                                </label>
                            </div>

                            {formData.periodType === 'period' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500 block mb-1">開始日</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500 block mb-1">終了日</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            )}
                        </Field>

                        {/* 利用回数上限 */}
                        <Field label="利用回数上限" id="usageLimit">
                            <div className="flex items-center gap-2">
                                <input
                                    id="usageLimit"
                                    type="number"
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    placeholder="空欄で無制限"
                                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <span className="text-gray-500 whitespace-nowrap">回</span>
                            </div>
                        </Field>

                        {/* 1人1回制限 */}
                        <div className="mb-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.oncePerUser}
                                    onChange={(e) => setFormData({ ...formData, oncePerUser: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span>1人1回まで（LINE IDで判定）</span>
                            </label>
                        </div>

                        {/* 有効/無効 */}
                        <Field label="ステータス" id="isActive">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="isActive"
                                        value="active"
                                        checked={formData.isActive}
                                        onChange={() => setFormData({ ...formData, isActive: true })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    有効
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="isActive"
                                        value="inactive"
                                        checked={!formData.isActive}
                                        onChange={() => setFormData({ ...formData, isActive: false })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    無効
                                </label>
                            </div>
                        </Field>
                    </div>

                    {/* 保存ボタン */}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            '保存'
                        )}
                    </Button>

                    {/* 削除リンク（編集モードのみ） */}
                    {!isNewMode && (
                        <button
                            onClick={handleDelete}
                            className="w-full mt-6 text-center text-red-600 hover:text-red-800 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            このクーポンを削除
                        </button>
                    )}
                </div>
            </AdminLayout>
        </RequireAuth>
    );
}

export default CouponEditPage;
