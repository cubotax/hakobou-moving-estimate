/**
 * 管理画面 - 見積もり一覧（ダッシュボード）
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useEstimates, useMessages, Estimate } from '@/hooks/useAdminApi';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';

// ステータスラベル
const statusLabels: Record<string, string> = {
    estimated: '概算見積完了',
    photo_diagnosis: '写真診断中',
    consulting: '日程調整中',
    invite_sent: '申込案内送信済み',
    applied: '申込完了',
    payment_sent: '決済案内送信済み',
    paid: '決済完了',
    cancelled: 'キャンセル',
};


// ステータスに応じたバッジスタイル
const statusStyles: Record<string, string> = {
    estimated: 'bg-gray-100 text-gray-700',
    photo_diagnosis: 'bg-purple-100 text-purple-800',
    consulting: 'bg-blue-100 text-blue-700',
    invite_sent: 'bg-purple-100 text-purple-700',
    applied: 'bg-yellow-100 text-yellow-700',
    payment_sent: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};


// 日時フォーマット（年月日 + 時間）改行あり・センター揃え
function formatDateTime(dateStr: string | null) {
    if (!dateStr) return <div className="text-center">-</div>;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return (
        <div className="text-center">
            <div>{year}/{month}/{day}</div>
            <div>{hours}:{minutes}</div>
        </div>
    );
}

// 期間オプション
const periodOptions = [
    { value: 'all', label: '全期間' },
    { value: 'today', label: '今日' },
    { value: 'week', label: '今週' },
    { value: 'month', label: '今月' },
];

// 日付フォーマット
function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 金額フォーマット
function formatFee(fee: number | null | undefined) {
    if (fee === null || fee === undefined) return '-';
    return `¥${fee.toLocaleString()}`;
}

function AdminDashboard() {
    const { loading, error, getEstimates, deleteEstimate } = useEstimates();
    const { sendInvite, sendPayment, loading: sendingLoading } = useMessages();

    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [statusFilter, setStatusFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);

    // データ取得
    const fetchEstimates = useCallback(async () => {
        const result = await getEstimates({
            status: statusFilter === 'all' ? undefined : statusFilter,
            period: periodFilter === 'all' ? undefined : periodFilter,
            search: searchQuery || undefined,
            page,
            limit: 20,
        });

        if (result) {
            setEstimates(result.estimates);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        }
    }, [getEstimates, statusFilter, periodFilter, searchQuery, page]);

    useEffect(() => {
        fetchEstimates();
    }, [fetchEstimates]);

    // 削除処理
    const handleDelete = async () => {
        if (!deleteTarget) return;
        const success = await deleteEstimate(deleteTarget.id);
        if (success) {
            setDeleteTarget(null);
            // 現在のページのデータが1件だけの場合、前のページに戻る
            if (estimates.length === 1 && page > 1) {
                setPage(page - 1);
            } else {
                fetchEstimates();
            }
        }
    };


    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div>
                        <h1 className="text-2xl font-bold">見積もり一覧</h1>
                    </div>

                    {/* フィルター */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">ステータス:</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="全て" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">全て</SelectItem>
                                        {Object.entries(statusLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">期間:</span>
                                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="今月" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {periodOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <Input
                                        type="text"
                                        placeholder="電話番号・IDで検索..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {/* 一覧テーブル */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                            <span className="font-medium">■ 見積もり一覧</span>
                            <span className="text-sm text-gray-500">全 {total} 件</span>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                読み込み中...
                            </div>
                        ) : estimates.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                データがありません
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">取得日時</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">集荷先</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">お届け先</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">金額</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">集荷日</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">お届け日</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ステータス</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">削除</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {estimates.map((estimate) => (
                                            <tr key={estimate.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">
                                                    {formatDateTime(estimate.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/admin/estimates/${estimate.id}`}
                                                        className="font-mono text-sm text-blue-600 hover:underline"
                                                    >
                                                        {estimate.id.slice(0, 8)}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {estimate.pickup_prefecture}{estimate.pickup_city?.slice(0, 4)}...
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {estimate.delivery_prefecture}{estimate.delivery_city?.slice(0, 4)}...
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium">
                                                    {formatFee(estimate.final_fee || estimate.total_fee)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    {formatDate(estimate.pickup_date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    {formatDate(estimate.delivery_date)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusStyles[estimate.status] || 'bg-gray-100'}`}>
                                                        {statusLabels[estimate.status] || estimate.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setDeleteTarget(estimate)}
                                                        className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                                                        title="削除"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ページネーション */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 flex justify-center items-center gap-4">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} />
                                    前へ
                                </button>
                                <span className="text-sm text-gray-600">
                                    {page} / {totalPages} ページ
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                                >
                                    次へ
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 削除確認モーダル */}
                <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>見積もりを削除</DialogTitle>
                            <DialogDescription>
                                この見積もりを完全に削除します。関連するすべてのデータ（変更履歴、メモ、送信履歴など）も削除されます。この操作は取り消せません。
                            </DialogDescription>
                        </DialogHeader>

                        {deleteTarget && (
                            <div className="py-4 space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">見積もりID:</span>
                                    <span className="font-mono">{deleteTarget.id}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">金額:</span>
                                    <span className="font-medium">
                                        {formatFee(deleteTarget.final_fee || deleteTarget.total_fee)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteTarget(null)}
                                disabled={loading}
                            >
                                キャンセル
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                {loading ? '削除中...' : '削除する'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </RequireAuth>
    );
}

export default AdminDashboard;
