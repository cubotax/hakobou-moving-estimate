/**
 * 管理画面 - 見積もり詳細
 */

import { useState, useEffect, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import {
    useEstimates,
    useMemos,
    useMessages,
    Estimate,
    Memo,
    MessageLog
} from '@/hooks/useAdminApi';
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Plus, Send } from 'lucide-react';

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

// ステータスバッジスタイル
const statusBadgeStyles: Record<string, { bg: string; text: string }> = {
    estimated: { bg: '#E5E7EB', text: '#374151' },
    consulting: { bg: '#FEF3C7', text: '#92400E' },
    application_sent: { bg: '#DBEAFE', text: '#1E40AF' },
    applied: { bg: '#D1FAE5', text: '#065F46' },
    payment_sent: { bg: '#EDE9FE', text: '#5B21B6' },
    paid: { bg: '#A7F3D0', text: '#047857' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

// メッセージタイプラベル
const messageTypeLabels: Record<string, string> = {
    estimate: '見積もり送信',
    invite: '申込案内送信',
    payment: '決済案内送信',
};

// 時間帯ラベル
const timeSlotLabels: Record<string, string> = {
    morning: '午前',
    afternoon: '午後',
    anytime: 'どちらでも',
};

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
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 金額フォーマット
function formatFee(fee: number | null | undefined) {
    if (fee === null || fee === undefined) return '-';
    return `¥${fee.toLocaleString()}`;
}

function EstimateDetail() {
    const [, params] = useRoute('/admin/estimates/:id');
    const estimateId = params?.id;

    const { getEstimate, updateStatus, updateFee, loading } = useEstimates();
    const { getMemos, addMemo, loading: memosLoading } = useMemos();
    const { getLogs, sendInvite, sendPayment, loading: messagesLoading } = useMessages();

    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [logs, setLogs] = useState<MessageLog[]>([]);

    // モーダル状態
    const [editFeeModal, setEditFeeModal] = useState(false);
    const [addMemoModal, setAddMemoModal] = useState(false);
    const [sendModal, setSendModal] = useState<'invite' | 'payment' | null>(null);

    // フォーム状態
    const [newFee, setNewFee] = useState('');
    const [feeReason, setFeeReason] = useState('');
    const [memoContent, setMemoContent] = useState('');

    // データ取得
    const fetchData = useCallback(async () => {
        if (!estimateId) return;

        const [estimateData, memosData, logsData] = await Promise.all([
            getEstimate(estimateId),
            getMemos(estimateId),
            getLogs(estimateId),
        ]);

        if (estimateData) setEstimate(estimateData);
        setMemos(memosData);
        setLogs(logsData);
    }, [estimateId, getEstimate, getMemos, getLogs]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ステータス変更
    const handleStatusChange = async (newStatus: string) => {
        if (!estimateId) return;
        const success = await updateStatus(estimateId, newStatus);
        if (success) fetchData();
    };

    // 金額変更
    const handleFeeSubmit = async () => {
        if (!estimateId || !newFee) return;
        const success = await updateFee(estimateId, parseInt(newFee), feeReason);
        if (success) {
            setEditFeeModal(false);
            setNewFee('');
            setFeeReason('');
            fetchData();
        }
    };

    // メモ追加
    const handleMemoSubmit = async () => {
        if (!estimateId || !memoContent.trim()) return;
        const success = await addMemo(estimateId, memoContent);
        if (success) {
            setAddMemoModal(false);
            setMemoContent('');
            fetchData();
        }
    };

    // メッセージ送信
    const handleSend = async () => {
        if (!estimateId || !sendModal) return;
        const success = sendModal === 'invite'
            ? await sendInvite(estimateId)
            : await sendPayment(estimateId);
        if (success) {
            setSendModal(null);
            fetchData();
        }
    };

    if (loading && !estimate) {
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

    if (!estimate) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">見積もりが見つかりませんでした</div>
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* 戻るリンク */}
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft size={18} />
                        一覧に戻る
                    </Link>

                    {/* 基本情報 */}
                    <Section title="基本情報">
                        <div className="space-y-3">
                            <InfoRow label="見積ID" value={estimate.id} mono />
                            <InfoRow label="作成日時" value={formatDateTime(estimate.created_at)} />
                            <div className="flex items-center justify-between py-2">
                                <span className="text-gray-500">ステータス:</span>
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{
                                        backgroundColor: statusBadgeStyles[estimate.status]?.bg || '#E5E7EB',
                                        color: statusBadgeStyles[estimate.status]?.text || '#374151',
                                    }}
                                >
                                    {statusLabels[estimate.status] || estimate.status}
                                </span>
                            </div>
                        </div>
                    </Section>

                    {/* 集荷先 */}
                    <Section title="集荷先">
                        <div className="space-y-3">
                            <InfoRow
                                label="住所"
                                value={`${estimate.pickup_prefecture}${estimate.pickup_city}${estimate.pickup_town}`}
                            />
                            {estimate.pickup_address_detail && (
                                <InfoRow label="番地" value={estimate.pickup_address_detail} />
                            )}
                            {estimate.pickup_building && (
                                <InfoRow label="建物" value={estimate.pickup_building} />
                            )}
                            <InfoRow
                                label="階数 / エレベーター"
                                value={`${estimate.floor_pickup}階 / ${estimate.has_elevator_pickup ? 'あり' : 'なし'}`}
                            />
                            {estimate.pickup_time_slot && (
                                <InfoRow
                                    label="希望時間帯"
                                    value={timeSlotLabels[estimate.pickup_time_slot] || estimate.pickup_time_slot}
                                />
                            )}
                        </div>
                    </Section>

                    {/* お届け先 */}
                    <Section title="お届け先">
                        <div className="space-y-3">
                            <InfoRow
                                label="住所"
                                value={`${estimate.delivery_prefecture}${estimate.delivery_city}${estimate.delivery_town}`}
                            />
                            {estimate.delivery_address_detail && (
                                <InfoRow label="番地" value={estimate.delivery_address_detail} />
                            )}
                            {estimate.delivery_building && (
                                <InfoRow label="建物" value={estimate.delivery_building} />
                            )}
                            <InfoRow
                                label="階数 / エレベーター"
                                value={`${estimate.floor_delivery}階 / ${estimate.has_elevator_delivery ? 'あり' : 'なし'}`}
                            />
                            {estimate.delivery_time_slot && (
                                <InfoRow
                                    label="希望時間帯"
                                    value={timeSlotLabels[estimate.delivery_time_slot] || estimate.delivery_time_slot}
                                />
                            )}
                        </div>
                    </Section>

                    {/* 日程 */}
                    <Section title="日程">
                        <div className="space-y-3">
                            <InfoRow label="集荷日" value={formatDate(estimate.pickup_date)} />
                            <InfoRow label="お届け日" value={formatDate(estimate.delivery_date)} />
                        </div>
                    </Section>

                    {/* プラン・オプション */}
                    <Section title="プラン・オプション">
                        <div className="space-y-3">
                            <InfoRow label="プラン" value={estimate.plan || 'スタンダード'} />
                            <InfoRow label="梱包サービス" value={estimate.needs_packing ? '利用する' : '利用しない'} />
                        </div>
                    </Section>

                    {/* 金額 */}
                    <Section
                        title="金額"
                        action={
                            <button
                                onClick={() => {
                                    setNewFee((estimate.final_fee || estimate.total_fee || 0).toString());
                                    setEditFeeModal(true);
                                }}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Edit size={14} />
                                金額を編集
                            </button>
                        }
                    >
                        <div className="space-y-3">
                            <InfoRow label="見積金額" value={formatFee(estimate.total_fee)} />
                            {estimate.coupon_code && (
                                <InfoRow
                                    label="クーポン"
                                    value={`${estimate.coupon_code}（${formatFee(-estimate.discount_amount)}）`}
                                />
                            )}
                            <InfoRow
                                label="最終金額"
                                value={formatFee(estimate.final_fee || estimate.total_fee)}
                                bold
                            />
                            {estimate.fee_change_reason && (
                                <InfoRow label="変更理由" value={estimate.fee_change_reason} />
                            )}
                        </div>
                    </Section>

                    {/* 連絡先 */}
                    {estimate.phone && (
                        <Section title="連絡先">
                            <InfoRow label="電話番号" value={estimate.phone} />
                        </Section>
                    )}

                    {/* 備考 */}
                    {estimate.notes && (
                        <Section title="備考">
                            <p className="text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
                        </Section>
                    )}

                    {/* 管理者メモ */}
                    <Section
                        title="管理者メモ"
                        action={
                            <button
                                onClick={() => setAddMemoModal(true)}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={14} />
                                メモを追加
                            </button>
                        }
                    >
                        {memos.length === 0 ? (
                            <p className="text-gray-400 text-sm">メモはありません</p>
                        ) : (
                            <div className="space-y-4">
                                {memos.map((memo) => (
                                    <div key={memo.id} className="border-l-2 border-gray-200 pl-4">
                                        <div className="text-xs text-gray-400 mb-1">
                                            {formatDateTime(memo.created_at)} {memo.created_by}
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap">{memo.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* アクション */}
                    <Section title="アクション">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => setSendModal('invite')}
                                disabled={!estimate.line_user_id}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Send size={16} className="mr-2" />
                                申込案内を送信
                            </Button>
                            <Button
                                onClick={() => setSendModal('payment')}
                                disabled={!estimate.line_user_id}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Send size={16} className="mr-2" />
                                決済案内を送信
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleStatusChange('cancelled')}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                                キャンセルにする
                            </Button>
                        </div>
                        {!estimate.line_user_id && (
                            <p className="text-sm text-gray-400 mt-2">
                                ※ LINE連携がないため送信できません
                            </p>
                        )}
                    </Section>

                    {/* 送信履歴 */}
                    <Section title="送信履歴">
                        {logs.length === 0 ? (
                            <p className="text-gray-400 text-sm">送信履歴はありません</p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-400">{formatDateTime(log.sent_at)}</span>
                                        <span className="font-medium">{messageTypeLabels[log.message_type]}</span>
                                        {log.sent_by && (
                                            <span className="text-gray-400">by {log.sent_by}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {/* 金額編集モーダル */}
                <Dialog open={editFeeModal} onOpenChange={setEditFeeModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>金額を編集</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">元の見積金額</label>
                                <p className="text-lg font-medium">{formatFee(estimate?.total_fee)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">最終金額</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <span>¥</span>
                                    <Input
                                        type="number"
                                        value={newFee}
                                        onChange={(e) => setNewFee(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">変更理由</label>
                                <Input
                                    value={feeReason}
                                    onChange={(e) => setFeeReason(e.target.value)}
                                    placeholder="荷物追加のため"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditFeeModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleFeeSubmit} disabled={loading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* メモ追加モーダル */}
                <Dialog open={addMemoModal} onOpenChange={setAddMemoModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>メモを追加</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Textarea
                                value={memoContent}
                                onChange={(e) => setMemoContent(e.target.value)}
                                rows={4}
                                placeholder="メモを入力..."
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddMemoModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleMemoSubmit} disabled={memosLoading}>
                                追加する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 送信確認モーダル */}
                <Dialog open={!!sendModal} onOpenChange={() => setSendModal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {sendModal === 'invite' ? '申込案内を送信' : '決済案内を送信'}
                            </DialogTitle>
                            <DialogDescription>
                                以下の内容でLINEメッセージを送信します。よろしいですか？
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">送信先:</span>
                                <span className="font-mono">{estimate?.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">金額:</span>
                                <span className="font-medium">
                                    {formatFee(estimate?.final_fee || estimate?.total_fee)}
                                </span>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSendModal(null)}>
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={messagesLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                送信する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </RequireAuth>
    );
}

// セクションコンポーネント
function Section({
    title,
    children,
    action
}: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-medium">■ {title}</span>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

// 情報行コンポーネント
function InfoRow({
    label,
    value,
    mono = false,
    bold = false,
}: {
    label: string;
    value: string | null | undefined;
    mono?: boolean;
    bold?: boolean;
}) {
    return (
        <div className="flex justify-between py-2">
            <span className="text-gray-500">{label}:</span>
            <span className={`${mono ? 'font-mono' : ''} ${bold ? 'font-bold text-lg' : ''}`}>
                {value || '-'}
            </span>
        </div>
    );
}

export default EstimateDetail;
