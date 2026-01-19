/**
 * 管理画面 - クーポン一覧
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useCoupons, Coupon } from '@/hooks/useAdminApi';
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
import { Plus, Edit } from 'lucide-react';

// クーポンステータス判定
function getCouponStatus(coupon: Coupon): { label: string; style: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 手動で無効化されている場合
    if (!coupon.is_active) {
        return { label: '終了', style: 'bg-gray-100 text-gray-600' };
    }

    // 期間チェック
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

    // 利用回数上限チェック
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return { label: '終了', style: 'bg-gray-100 text-gray-600' };
    }

    return { label: '有効', style: 'bg-green-100 text-green-700' };
}

// 日付フォーマット
function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 割引表示
function formatDiscount(coupon: Coupon) {
    if (coupon.discount_type === 'fixed') {
        return `¥${coupon.discount_value.toLocaleString()} OFF`;
    }
    return `${coupon.discount_value}% OFF`;
}

// 有効期間表示
function formatPeriod(coupon: Coupon) {
    if (!coupon.start_date && !coupon.end_date) {
        return '常時';
    }
    if (coupon.start_date && coupon.end_date) {
        return `${formatDate(coupon.start_date)}〜${formatDate(coupon.end_date)}`;
    }
    if (coupon.start_date) {
        return `${formatDate(coupon.start_date)}〜`;
    }
    return `〜${formatDate(coupon.end_date)}`;
}

// 利用回数表示
function formatUsage(coupon: Coupon) {
    if (coupon.usage_limit === null) {
        return '--';
    }
    return `${coupon.usage_count}/${coupon.usage_limit}`;
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

function CouponsPage() {
    const { getCoupons, createCoupon, updateCoupon, loading, error } = useCoupons();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState(initialFormData);

    // データ取得
    const fetchCoupons = async () => {
        const data = await getCoupons();
        setCoupons(data);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    // モーダルを開く
    const openCreateModal = () => {
        setEditingCoupon(null);
        setFormData(initialFormData);
        setModalOpen(true);
    };

    const openEditModal = (coupon: Coupon) => {
        setEditingCoupon(coupon);
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
        setModalOpen(true);
    };

    // 保存処理
    const handleSubmit = async () => {
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

        let success;
        if (editingCoupon) {
            success = await updateCoupon(editingCoupon.id, couponData);
        } else {
            success = await createCoupon(couponData);
        }

        if (success) {
            setModalOpen(false);
            fetchCoupons();
        }
    };

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">クーポン管理</h1>
                        <Button onClick={openCreateModal} className="pop-button">
                            <Plus size={18} className="mr-2" />
                            新規作成
                        </Button>
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {/* 一覧テーブル */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <span className="font-medium">■ クーポン一覧</span>
                        </div>

                        {loading && coupons.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                読み込み中...
                            </div>
                        ) : coupons.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                クーポンがありません
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">コード</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">割引</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">最低額</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">有効期間</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">残り</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">状態</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {coupons.map((coupon) => {
                                            const status = getCouponStatus(coupon);

                                            return (
                                                <tr key={coupon.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <Link
                                                            href={`/admin/coupons/${coupon.id}`}
                                                            className="font-mono font-medium text-blue-600 hover:underline"
                                                        >
                                                            {coupon.code}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {formatDiscount(coupon)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        ¥{coupon.min_amount.toLocaleString()}以上
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        {formatPeriod(coupon)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        {formatUsage(coupon)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.style}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => openEditModal(coupon)}
                                                            className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 作成・編集モーダル */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCoupon ? 'クーポンを編集' : 'クーポンを作成'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* クーポンコード */}
                            <div className="space-y-2">
                                <Label>クーポンコード *</Label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="WELCOME2026"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="characters"
                                    spellCheck="false"
                                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                                <p className="text-xs text-gray-500">※半角英数字、ハイフン使用可</p>
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
                                        className="w-48"
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
                            <Button variant="outline" onClick={() => setModalOpen(false)}>
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

export default CouponsPage;
