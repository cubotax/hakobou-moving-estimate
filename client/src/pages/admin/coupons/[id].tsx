/**
 * 管理画面 - クーポン詳細（利用履歴）
 */

import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useCoupons, Coupon, CouponUsage } from '@/hooks/useAdminApi';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit } from 'lucide-react';

// クーポンステータス判定
function getCouponStatusLabel(coupon: Coupon): { label: string; style: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!coupon.is_active) {
        return { label: '無効', style: 'bg-gray-100 text-gray-600' };
    }

    if (coupon.start_date) {
        const startDate = new Date(coupon.start_date);
        if (today < startDate) {
            return { label: '期間外', style: 'bg-yellow-100 text-yellow-700' };
        }
    }
    if (coupon.end_date) {
        const endDate = new Date(coupon.end_date);
        if (today > endDate) {
            return { label: '終了', style: 'bg-gray-100 text-gray-600' };
        }
    }

    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return { label: '終了', style: 'bg-gray-100 text-gray-600' };
    }

    return { label: '有効', style: 'bg-green-100 text-green-700' };
}

// 日付フォーマット
function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// 日時フォーマット
function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 金額フォーマット
function formatFee(fee: number | null | undefined) {
    if (fee === null || fee === undefined) return '-';
    return `¥${fee.toLocaleString()}`;
}

// 割引表示
function formatDiscount(coupon: Coupon) {
    if (coupon.discount_type === 'fixed') {
        return `¥${coupon.discount_value.toLocaleString()} OFF`;
    }
    return `${coupon.discount_value}% OFF`;
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

function CouponDetail() {
    const [, params] = useRoute('/admin/coupons/:id');
    const couponId = params?.id;

    const { getCoupon, getCouponUsages, updateCoupon, loading } = useCoupons();
    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [usages, setUsages] = useState<CouponUsage[]>([]);
    const [editModal, setEditModal] = useState(false);
    const [formData, setFormData] = useState(initialFormData);

    // データ取得
    const fetchData = async () => {
        if (!couponId) return;

        const [couponData, usagesData] = await Promise.all([
            getCoupon(couponId),
            getCouponUsages(couponId),
        ]);

        if (couponData) setCoupon(couponData);
        setUsages(usagesData);
    };

    useEffect(() => {
        fetchData();
    }, [couponId]);

    // 編集モーダルを開く
    const openEditModal = () => {
        if (!coupon) return;
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
        setEditModal(true);
    };

    // 保存処理
    const handleSubmit = async () => {
        if (!couponId) return;

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

        const success = await updateCoupon(couponId, couponData);
        if (success) {
            setEditModal(false);
            fetchData();
        }
    };

    if (loading && !coupon) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">読み込み中...</div>
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    if (!coupon) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">クーポンが見つかりませんでした</div>
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    const status = getCouponStatusLabel(coupon);

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div className="flex justify-between items-start">
                        <Link
                            href="/admin/coupons"
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft size={18} />
                            一覧に戻る
                        </Link>
                        <Button onClick={openEditModal} variant="outline">
                            <Edit size={16} className="mr-2" />
                            編集
                        </Button>
                    </div>

                    {/* クーポン情報 */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <span className="font-medium">■ クーポン情報</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">コード:</span>
                                <span className="font-mono font-bold text-lg">{coupon.code}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">割引:</span>
                                <span className="font-medium">{formatDiscount(coupon)}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">最低利用金額:</span>
                                <span>{formatFee(coupon.min_amount)}以上</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">有効期間:</span>
                                <span>
                                    {coupon.start_date || coupon.end_date
                                        ? `${formatDate(coupon.start_date)} 〜 ${formatDate(coupon.end_date)}`
                                        : '常時'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">利用回数:</span>
                                <span>
                                    {coupon.usage_count} / {coupon.usage_limit ?? '無制限'} 回
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">1人1回制限:</span>
                                <span>{coupon.once_per_user ? 'あり' : 'なし'}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">ステータス:</span>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.style}`}>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 利用履歴 */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <span className="font-medium">■ 利用履歴</span>
                        </div>

                        {usages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                利用履歴はありません
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">利用日時</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">見積ID</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">元金額</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">割引後</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LINE ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {usages.map((usage) => (
                                            <tr key={usage.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">
                                                    {formatDateTime(usage.used_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/admin/estimates/${usage.estimate_id}`}
                                                        className="font-mono text-sm text-blue-600 hover:underline"
                                                    >
                                                        {usage.estimate_id.slice(0, 8)}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {formatFee(usage.original_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium">
                                                    {formatFee(usage.final_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-500">
                                                    {usage.line_user_id.slice(0, 8)}...
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 編集モーダル */}
                <Dialog open={editModal} onOpenChange={setEditModal}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>クーポンを編集</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* クーポンコード */}
                            <div className="space-y-2">
                                <Label>クーポンコード *</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="WELCOME2026"
                                />
                            </div>

                            {/* 割引タイプ */}
                            <div className="space-y-2">
                                <Label>割引タイプ *</Label>
                                <RadioGroup
                                    value={formData.discountType}
                                    onValueChange={(value: 'fixed' | 'percentage') =>
                                        setFormData({ ...formData, discountType: value })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="fixed" id="fixed" />
                                        <Label htmlFor="fixed">定額割引（円）</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="percentage" id="percentage" />
                                        <Label htmlFor="percentage">割合割引（%）</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* 割引値 */}
                            <div className="space-y-2">
                                <Label>割引値 *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                        className="flex-1"
                                    />
                                    <span>{formData.discountType === 'fixed' ? '円' : '%'}</span>
                                </div>
                            </div>

                            {/* 最低利用金額 */}
                            <div className="space-y-2">
                                <Label>最低利用金額 *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={formData.minAmount}
                                        onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                        className="flex-1"
                                    />
                                    <span>円以上で利用可能</span>
                                </div>
                            </div>

                            {/* 有効期間 */}
                            <div className="space-y-2">
                                <Label>有効期間 *</Label>
                                <RadioGroup
                                    value={formData.periodType}
                                    onValueChange={(value: 'always' | 'period') =>
                                        setFormData({ ...formData, periodType: value })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="period" id="period" />
                                        <Label htmlFor="period">期間を設定</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="always" id="always" />
                                        <Label htmlFor="always">常時有効</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {formData.periodType === 'period' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>開始日</Label>
                                        <Input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>終了日</Label>
                                        <Input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {/* 利用回数上限 */}
                            <div className="space-y-2">
                                <Label>利用回数上限</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        placeholder="空欄で無制限"
                                        className="flex-1"
                                    />
                                    <span>回</span>
                                </div>
                            </div>

                            {/* 1人1回制限 */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="oncePerUser"
                                    checked={formData.oncePerUser}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, oncePerUser: checked as boolean })
                                    }
                                />
                                <Label htmlFor="oncePerUser">1人1回まで（LINE IDで判定）</Label>
                            </div>

                            {/* ステータス */}
                            <div className="space-y-2">
                                <Label>ステータス</Label>
                                <RadioGroup
                                    value={formData.isActive ? 'active' : 'inactive'}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, isActive: value === 'active' })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="active" id="active" />
                                        <Label htmlFor="active">有効</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="inactive" id="inactive" />
                                        <Label htmlFor="inactive">無効</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </RequireAuth>
    );
}

export default CouponDetail;
