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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ChevronLeft, ChevronRight, MoreVertical, Search, Check } from 'lucide-react';

// ステータスラベル
const statusLabels: Record<string, string> = {
    estimated: '見積完了',
    consulting: '相談中',
    invite_sent: '申込案内送信済み',
    applied: '申込完了',
    payment_sent: '決済案内送信済み',
    paid: '決済完了',
    cancelled: 'キャンセル',
};

// ステータスに応じたバッジスタイル
const statusStyles: Record<string, string> = {
    estimated: 'bg-gray-100 text-gray-700',
    consulting: 'bg-blue-100 text-blue-700',
    invite_sent: 'bg-purple-100 text-purple-700',
    applied: 'bg-yellow-100 text-yellow-700',
    payment_sent: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

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
    const { loading, error, getEstimates } = useEstimates();
    const { sendInvite, sendPayment, loading: sendingLoading } = useMessages();

    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [statusFilter, setStatusFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [confirmModal, setConfirmModal] = useState<{
        type: 'invite' | 'payment';
        estimate: Estimate;
    } | null>(null);

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

    // アクションボタンの表示判定
    const getActionButton = (estimate: Estimate) => {
        switch (estimate.status) {
            case 'consulting':
                return {
                    label: '申込案内を送信',
                    action: () => setConfirmModal({ type: 'invite', estimate }),
                    disabled: false,
                };
            case 'invite_sent':
                return { label: '送信済み', disabled: true };
            case 'applied':
                return {
                    label: '決済案内を送信',
                    action: () => setConfirmModal({ type: 'payment', estimate }),
                    disabled: false,
                };
            case 'payment_sent':
                return { label: '送信済み', disabled: true };
            case 'paid':
                return { label: '✓ 完了', disabled: true, success: true };
            default:
                return null;
        }
    };

    // 送信処理
    const handleSend = async () => {
        if (!confirmModal) return;

        const success = confirmModal.type === 'invite'
            ? await sendInvite(confirmModal.estimate.id)
            : await sendPayment(confirmModal.estimate.id);

        if (success) {
            setConfirmModal(null);
            fetchEstimates();
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
                                <table className="w-full min-w-[700px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">集荷先</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">お届け先</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">金額</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">集荷日</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ステータス</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {estimates.map((estimate) => {
                                            const actionButton = getActionButton(estimate);

                                            return (
                                                <tr key={estimate.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <Link
                                                            href={`/admin/estimates/${estimate.id}`}
                                                            className="font-mono text-sm text-blue-600 hover:underline"
                                                        >
                                                            {estimate.id.slice(0, 8)}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {estimate.pickup_prefecture}{estimate.pickup_city.slice(0, 4)}...
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {estimate.delivery_prefecture}{estimate.delivery_city.slice(0, 4)}...
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium">
                                                        {formatFee(estimate.final_fee || estimate.total_fee)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        {formatDate(estimate.pickup_date)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusStyles[estimate.status] || 'bg-gray-100'}`}>
                                                            {statusLabels[estimate.status] || estimate.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {actionButton ? (
                                                            actionButton.disabled ? (
                                                                <span className={`text-xs ${actionButton.success ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    {actionButton.label}
                                                                </span>
                                                            ) : (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button className="p-1 hover:bg-gray-100 rounded">
                                                                            <MoreVertical size={18} className="text-gray-500" />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={actionButton.action}>
                                                                            {actionButton.label}
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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

                {/* 送信確認モーダル */}
                <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {confirmModal?.type === 'invite' ? '申込案内を送信' : '決済案内を送信'}
                            </DialogTitle>
                            <DialogDescription>
                                以下の内容でLINEメッセージを送信します。よろしいですか？
                            </DialogDescription>
                        </DialogHeader>

                        {confirmModal && (
                            <div className="py-4 space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">送信先:</span>
                                    <span className="font-mono">{confirmModal.estimate.id}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">金額:</span>
                                    <span className="font-medium">
                                        {formatFee(confirmModal.estimate.final_fee || confirmModal.estimate.total_fee)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmModal(null)}
                                disabled={sendingLoading}
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={sendingLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {sendingLoading ? '送信中...' : '送信する'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </RequireAuth>
    );
}

export default AdminDashboard;
