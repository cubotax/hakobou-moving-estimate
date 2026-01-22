/**
 * 管理画面 - クーポン一覧
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useCoupons, Coupon } from '@/hooks/useAdminApi';
import { Button } from '@/components/ui/button';
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

function CouponsPage() {
    const { getCoupons, loading, error } = useCoupons();
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    // データ取得
    const fetchCoupons = async () => {
        const data = await getCoupons();
        setCoupons(data);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">クーポン管理</h1>
                        <Link href="/admin/coupons/new">
                            <Button className="pop-button">
                                <Plus size={18} className="mr-2" />
                                新規作成
                            </Button>
                        </Link>
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
                                                        <Link
                                                            href={`/admin/coupons/${coupon.id}/edit`}
                                                            className="inline-block p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                                        >
                                                            <Edit size={16} />
                                                        </Link>
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
            </AdminLayout>
        </RequireAuth>
    );
}

export default CouponsPage;
