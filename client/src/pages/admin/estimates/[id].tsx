/**
 * 管理画面 - 見積もり詳細（調整機能付き）
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
    MessageLog,
    AdjustmentData
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
import { ArrowLeft, Edit, Plus, Send, ArrowRight, XCircle } from 'lucide-react';

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

// プランラベル
const planLabels: Record<string, string> = {
    helper: 'ヘルパープラン',
    omakase: 'お任せプラン',
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

    const { getEstimate, updateStatus, updateFee, updateAdjustment, loading } = useEstimates();
    const { getMemos, addMemo, loading: memosLoading } = useMemos();
    const { getLogs, sendInvite, sendPayment, loading: messagesLoading } = useMessages();

    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [logs, setLogs] = useState<MessageLog[]>([]);

    // モーダル状態
    const [editFeeModal, setEditFeeModal] = useState(false);
    const [addMemoModal, setAddMemoModal] = useState(false);
    const [sendModal, setSendModal] = useState<'invite' | 'payment' | null>(null);
    const [cancelModal, setCancelModal] = useState(false);

    // 調整モーダル状態
    const [editDateModal, setEditDateModal] = useState(false);
    const [editPlanModal, setEditPlanModal] = useState(false);
    const [editPickupModal, setEditPickupModal] = useState(false);
    const [editDeliveryModal, setEditDeliveryModal] = useState(false);

    // フォーム状態
    const [newFee, setNewFee] = useState('');
    const [feeReason, setFeeReason] = useState('');
    const [memoContent, setMemoContent] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    // 調整フォーム状態
    const [adjPickupDate, setAdjPickupDate] = useState('');
    const [adjDeliveryDate, setAdjDeliveryDate] = useState('');
    const [adjPlan, setAdjPlan] = useState('');
    const [adjNeedsPacking, setAdjNeedsPacking] = useState(false);
    const [adjFloorPickup, setAdjFloorPickup] = useState(1);
    const [adjHasElevatorPickup, setAdjHasElevatorPickup] = useState(false);
    const [adjFloorDelivery, setAdjFloorDelivery] = useState(1);
    const [adjHasElevatorDelivery, setAdjHasElevatorDelivery] = useState(false);

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

    // キャンセル処理
    const handleCancel = async () => {
        if (!estimateId) return;
        const success = await updateStatus(estimateId, 'cancelled');
        if (success) {
            setCancelModal(false);
            setCancelReason('');
            fetchData();
        }
    };

    // 日程調整保存
    const handleDateAdjustment = async () => {
        if (!estimateId) return;
        const success = await updateAdjustment(estimateId, {
            adjustedPickupDate: adjPickupDate || undefined,
            adjustedDeliveryDate: adjDeliveryDate || undefined,
        });
        if (success) {
            setEditDateModal(false);
            fetchData();
        }
    };

    // プラン調整保存
    const handlePlanAdjustment = async () => {
        if (!estimateId) return;
        const success = await updateAdjustment(estimateId, {
            adjustedPlan: adjPlan || undefined,
            adjustedNeedsPacking: adjNeedsPacking,
        });
        if (success) {
            setEditPlanModal(false);
            fetchData();
        }
    };

    // 集荷先条件調整保存
    const handlePickupAdjustment = async () => {
        if (!estimateId) return;
        const success = await updateAdjustment(estimateId, {
            adjustedFloorPickup: adjFloorPickup,
            adjustedHasElevatorPickup: adjHasElevatorPickup,
        });
        if (success) {
            setEditPickupModal(false);
            fetchData();
        }
    };

    // お届け先条件調整保存
    const handleDeliveryAdjustment = async () => {
        if (!estimateId) return;
        const success = await updateAdjustment(estimateId, {
            adjustedFloorDelivery: adjFloorDelivery,
            adjustedHasElevatorDelivery: adjHasElevatorDelivery,
        });
        if (success) {
            setEditDeliveryModal(false);
            fetchData();
        }
    };

    // 日程編集モーダルを開く
    const openDateModal = () => {
        if (!estimate) return;
        setAdjPickupDate(estimate.adjusted_pickup_date || estimate.pickup_date || '');
        setAdjDeliveryDate(estimate.adjusted_delivery_date || estimate.delivery_date || '');
        setEditDateModal(true);
    };

    // プラン編集モーダルを開く
    const openPlanModal = () => {
        if (!estimate) return;
        setAdjPlan(estimate.adjusted_plan || estimate.plan || '');
        setAdjNeedsPacking(estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false);
        setEditPlanModal(true);
    };

    // 集荷先条件編集モーダルを開く
    const openPickupModal = () => {
        if (!estimate) return;
        setAdjFloorPickup(estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1);
        setAdjHasElevatorPickup(estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false);
        setEditPickupModal(true);
    };

    // お届け先条件編集モーダルを開く
    const openDeliveryModal = () => {
        if (!estimate) return;
        setAdjFloorDelivery(estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1);
        setAdjHasElevatorDelivery(estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false);
        setEditDeliveryModal(true);
    };

    // ユーザーイベントを時系列で構築
    const buildUserEvents = () => {
        if (!estimate) return [];

        const events: { date: string; label: string; details?: string }[] = [];

        // 見積もり作成
        if (estimate.created_at) {
            events.push({
                date: estimate.created_at,
                label: '見積もり作成',
                details: `${estimate.pickup_prefecture}${estimate.pickup_city} → ${estimate.delivery_prefecture}${estimate.delivery_city}`,
            });
        }

        // 相談開始
        if (estimate.consulted_at) {
            events.push({
                date: estimate.consulted_at,
                label: '相談開始',
                details: 'LINEで「このプランで相談する」を押下',
            });
        }

        // 申込完了
        if (estimate.applied_at) {
            const name = [estimate.last_name, estimate.first_name].filter(Boolean).join(' ') || '未入力';
            const phone = estimate.phone || '未入力';
            events.push({
                date: estimate.applied_at,
                label: '申込完了',
                details: `${name} / ${phone}`,
            });
        }

        // 時系列でソート（新しい順）
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return events;
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

    const userEvents = buildUserEvents();

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

                    {/* アクション（上部に移動） */}
                    <Section title="アクション">
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                            <Button
                                onClick={() => setSendModal('invite')}
                                disabled={!estimate.line_user_id}
                                className="bg-[#FF6DA9] hover:bg-[#E85A96]"
                            >
                                <Send size={16} className="mr-2" />
                                申込案内を送信
                            </Button>
                            <Button
                                onClick={() => setSendModal('payment')}
                                disabled={!estimate.line_user_id}
                                className="bg-[#46CD55] hover:bg-[#3BB84A]"
                            >
                                <Send size={16} className="mr-2" />
                                決済案内を送信
                            </Button>
                            {estimate.status !== 'cancelled' && estimate.status !== 'paid' && (
                                <Button
                                    onClick={() => setCancelModal(true)}
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    <XCircle size={16} className="mr-2" />
                                    キャンセルにする
                                </Button>
                            )}
                            {!estimate.line_user_id && (
                                <p className="text-sm text-gray-400">
                                    ※LINE連携がないため送信できません
                                </p>
                            )}
                        </div>
                    </Section>

                    {/* 基本情報 */}
                    <Section title="基本情報">
                        <div className="space-y-3">
                            <InfoRow label="見積ID" value={estimate.id} mono />
                            <InfoRow label="作成日時" value={formatDateTime(estimate.created_at)} />
                            <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-100">
                                <span className="text-gray-500">ステータス:</span>
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium w-fit"
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

                    {/* 日程（2列表示） */}
                    <Section
                        title="日程"
                        action={
                            <button
                                onClick={openDateModal}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Edit size={14} />
                                編集
                            </button>
                        }
                    >
                        <TwoColumnRow
                            label="集荷日"
                            original={formatDate(estimate.pickup_date)}
                            adjusted={estimate.adjusted_pickup_date ? formatDate(estimate.adjusted_pickup_date) : null}
                        />
                        <TwoColumnRow
                            label="お届け日"
                            original={formatDate(estimate.delivery_date)}
                            adjusted={estimate.adjusted_delivery_date ? formatDate(estimate.adjusted_delivery_date) : null}
                        />
                    </Section>

                    {/* プラン・オプション（2列表示） */}
                    <Section
                        title="プラン・オプション"
                        action={
                            <button
                                onClick={openPlanModal}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Edit size={14} />
                                編集
                            </button>
                        }
                    >
                        <TwoColumnRow
                            label="プラン"
                            original={planLabels[estimate.plan || ''] || '未選択'}
                            adjusted={estimate.adjusted_plan ? (planLabels[estimate.adjusted_plan] || estimate.adjusted_plan) : null}
                        />
                        <TwoColumnRow
                            label="梱包サービス"
                            original={estimate.needs_packing ? '希望する' : '希望しない'}
                            adjusted={estimate.adjusted_needs_packing !== null && estimate.adjusted_needs_packing !== undefined
                                ? (estimate.adjusted_needs_packing ? '希望する' : '希望しない')
                                : null}
                        />
                    </Section>

                    {/* 集荷先（2列表示） */}
                    <Section
                        title="集荷先"
                        action={
                            <button
                                onClick={openPickupModal}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Edit size={14} />
                                編集
                            </button>
                        }
                    >
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
                        <TwoColumnRow
                            label="階数"
                            original={`${estimate.floor_pickup}階`}
                            adjusted={estimate.adjusted_floor_pickup ? `${estimate.adjusted_floor_pickup}階` : null}
                        />
                        <TwoColumnRow
                            label="エレベーター"
                            original={estimate.has_elevator_pickup ? 'あり' : 'なし'}
                            adjusted={estimate.adjusted_has_elevator_pickup !== null && estimate.adjusted_has_elevator_pickup !== undefined
                                ? (estimate.adjusted_has_elevator_pickup ? 'あり' : 'なし')
                                : null}
                        />
                        {estimate.pickup_time_slot && (
                            <InfoRow
                                label="希望時間帯"
                                value={timeSlotLabels[estimate.pickup_time_slot] || estimate.pickup_time_slot}
                            />
                        )}
                    </Section>

                    {/* お届け先（2列表示） */}
                    <Section
                        title="お届け先"
                        action={
                            <button
                                onClick={openDeliveryModal}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Edit size={14} />
                                編集
                            </button>
                        }
                    >
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
                        <TwoColumnRow
                            label="階数"
                            original={`${estimate.floor_delivery}階`}
                            adjusted={estimate.adjusted_floor_delivery ? `${estimate.adjusted_floor_delivery}階` : null}
                        />
                        <TwoColumnRow
                            label="エレベーター"
                            original={estimate.has_elevator_delivery ? 'あり' : 'なし'}
                            adjusted={estimate.adjusted_has_elevator_delivery !== null && estimate.adjusted_has_elevator_delivery !== undefined
                                ? (estimate.adjusted_has_elevator_delivery ? 'あり' : 'なし')
                                : null}
                        />
                        {estimate.delivery_time_slot && (
                            <InfoRow
                                label="希望時間帯"
                                value={timeSlotLabels[estimate.delivery_time_slot] || estimate.delivery_time_slot}
                            />
                        )}
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
                            <TwoColumnRow
                                label="見積金額"
                                original={formatFee(estimate.total_fee)}
                                adjusted={estimate.final_fee && estimate.final_fee !== estimate.total_fee
                                    ? formatFee(estimate.final_fee)
                                    : null}
                            />
                            {estimate.coupon_code && (
                                <InfoRow
                                    label="クーポン"
                                    value={`${estimate.coupon_code}（${formatFee(-(estimate.discount_amount || 0))}）`}
                                />
                            )}
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

                    {/* 送信履歴 */}
                    <Section title="送信履歴">
                        {logs.length === 0 ? (
                            <p className="text-gray-400 text-sm">送信履歴はありません</p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                                    >
                                        <span>{messageTypeLabels[log.message_type] || log.message_type}</span>
                                        <span className="text-gray-400">{formatDateTime(log.sent_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* 顧客情報カルテ */}
                    <Section title="顧客情報カルテ">
                        <div className="space-y-6">
                            {/* 受信日時 */}
                            <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                                <div className="grid grid-cols-[140px_1fr] gap-2">
                                    <span className="text-gray-500">概算見積受信:</span>
                                    <span>{formatDateTime(estimate.created_at)}</span>
                                </div>
                                {estimate.applied_at && (
                                    <div className="grid grid-cols-[140px_1fr] gap-2">
                                        <span className="text-gray-500">申込情報受信:</span>
                                        <span>{formatDateTime(estimate.applied_at)}</span>
                                    </div>
                                )}
                            </div>

                            {/* お客様情報 */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700 border-b pb-1">【お客様情報】</h4>
                                <div className="space-y-1 pl-2">
                                    <InfoRow
                                        label="お名前"
                                        value={estimate.last_name && estimate.first_name
                                            ? `${estimate.last_name} ${estimate.first_name}`
                                            : null}
                                    />
                                    <InfoRow
                                        label="ふりがな"
                                        value={estimate.last_name_kana && estimate.first_name_kana
                                            ? `${estimate.last_name_kana} ${estimate.first_name_kana}`
                                            : null}
                                    />
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-100">
                                        <span className="text-gray-500">電話番号:</span>
                                        {estimate.phone ? (
                                            <a
                                                href={`tel:${estimate.phone}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {estimate.phone}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">未登録</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 集荷先情報 */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700 border-b pb-1">【集荷先情報】</h4>
                                <div className="space-y-1 pl-2">
                                    <InfoRow
                                        label="住所（市区町村まで）"
                                        value={`${estimate.pickup_prefecture || ''}${estimate.pickup_city || ''}${estimate.pickup_town || ''}`}
                                    />
                                    <InfoRow
                                        label="番地以降"
                                        value={estimate.pickup_address_detail || null}
                                    />
                                    <InfoRow
                                        label="建物名・部屋番号"
                                        value={estimate.pickup_building || null}
                                    />
                                    <InfoRow
                                        label="階数"
                                        value={`${estimate.floor_pickup || 1}階`}
                                    />
                                    <InfoRow
                                        label="エレベーター"
                                        value={estimate.has_elevator_pickup ? 'あり' : 'なし'}
                                    />
                                    <InfoRow
                                        label="希望日"
                                        value={formatDate(estimate.pickup_date)}
                                    />
                                    <InfoRow
                                        label="希望時間帯"
                                        value={estimate.pickup_time_slot
                                            ? (timeSlotLabels[estimate.pickup_time_slot] || estimate.pickup_time_slot)
                                            : null}
                                    />
                                </div>
                            </div>

                            {/* 配達先情報 */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700 border-b pb-1">【配達先情報】</h4>
                                <div className="space-y-1 pl-2">
                                    <InfoRow
                                        label="住所（市区町村まで）"
                                        value={`${estimate.delivery_prefecture || ''}${estimate.delivery_city || ''}${estimate.delivery_town || ''}`}
                                    />
                                    <InfoRow
                                        label="番地以降"
                                        value={estimate.delivery_address_detail || null}
                                    />
                                    <InfoRow
                                        label="建物名・部屋番号"
                                        value={estimate.delivery_building || null}
                                    />
                                    <InfoRow
                                        label="階数"
                                        value={`${estimate.floor_delivery || 1}階`}
                                    />
                                    <InfoRow
                                        label="エレベーター"
                                        value={estimate.has_elevator_delivery ? 'あり' : 'なし'}
                                    />
                                    <InfoRow
                                        label="希望日"
                                        value={formatDate(estimate.delivery_date)}
                                    />
                                    <InfoRow
                                        label="希望時間帯"
                                        value={estimate.delivery_time_slot
                                            ? (timeSlotLabels[estimate.delivery_time_slot] || estimate.delivery_time_slot)
                                            : null}
                                    />
                                </div>
                            </div>

                            {/* 見積条件 */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700 border-b pb-1">【見積条件】</h4>
                                <div className="space-y-1 pl-2">
                                    <InfoRow
                                        label="プラン"
                                        value={planLabels[estimate.plan || ''] || '未選択'}
                                    />
                                    <InfoRow
                                        label="梱包サービス"
                                        value={estimate.needs_packing ? '希望する' : '希望しない'}
                                    />
                                    <InfoRow
                                        label="距離"
                                        value={estimate.distance_km ? `${estimate.distance_km} km` : '-'}
                                    />
                                    <InfoRow label="高速料金" value={estimate.expressway_fee ? `¥${estimate.expressway_fee.toLocaleString()}` : '¥0'} />
                                    <InfoRow
                                        label="見積金額"
                                        value={formatFee(estimate.total_fee)}
                                    />
                                </div>
                            </div>

                            {/* 備考 */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700 border-b pb-1">【備考】</h4>
                                <div className="pl-2">
                                    <p className="text-gray-700 whitespace-pre-wrap">
                                        {estimate.notes || <span className="text-gray-400">なし</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ユーザーから送信された情報 */}
                    <Section title="ユーザーから送信された情報">
                        {userEvents.length === 0 ? (
                            <p className="text-gray-400 text-sm">情報はありません</p>
                        ) : (
                            <div className="space-y-3">
                                {userEvents.map((event, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                                    >
                                        <div>
                                            <span className="font-medium">{event.label}</span>
                                            {event.details && (
                                                <span className="text-gray-500 ml-2">{event.details}</span>
                                            )}
                                        </div>
                                        <span className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-0">
                                            {formatDateTime(event.date)}
                                        </span>
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
                            <DialogDescription>
                                最終金額と変更理由を入力してください
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">最終金額 *</label>
                                <Input
                                    type="number"
                                    value={newFee}
                                    onChange={(e) => setNewFee(e.target.value)}
                                    placeholder="例: 25000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">変更理由</label>
                                <Input
                                    value={feeReason}
                                    onChange={(e) => setFeeReason(e.target.value)}
                                    placeholder="例: オプション追加のため"
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

                {/* 日程調整モーダル */}
                <Dialog open={editDateModal} onOpenChange={setEditDateModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>日程の調整</DialogTitle>
                            <DialogDescription>
                                顧客希望: 集荷 {formatDate(estimate.pickup_date)} / お届け {formatDate(estimate.delivery_date)}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">調整後の集荷日</label>
                                <Input
                                    type="date"
                                    value={adjPickupDate}
                                    onChange={(e) => setAdjPickupDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">調整後のお届け日</label>
                                <Input
                                    type="date"
                                    value={adjDeliveryDate}
                                    onChange={(e) => setAdjDeliveryDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDateModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDateAdjustment} disabled={loading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* プラン調整モーダル */}
                <Dialog open={editPlanModal} onOpenChange={setEditPlanModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>プラン・オプションの調整</DialogTitle>
                            <DialogDescription>
                                顧客希望: {planLabels[estimate.plan || ''] || '未選択'} / 梱包: {estimate.needs_packing ? '希望する' : '希望しない'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">プラン</label>
                                <select
                                    value={adjPlan}
                                    onChange={(e) => setAdjPlan(e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                >
                                    <option value="">未選択</option>
                                    <option value="helper">ヘルパープラン</option>
                                    <option value="omakase">お任せプラン</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">梱包サービス</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={adjNeedsPacking}
                                            onChange={() => setAdjNeedsPacking(true)}
                                        />
                                        希望する
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={!adjNeedsPacking}
                                            onChange={() => setAdjNeedsPacking(false)}
                                        />
                                        希望しない
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditPlanModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handlePlanAdjustment} disabled={loading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 集荷先条件調整モーダル */}
                <Dialog open={editPickupModal} onOpenChange={setEditPickupModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>集荷先条件の調整</DialogTitle>
                            <DialogDescription>
                                住所: {estimate.pickup_prefecture}{estimate.pickup_city}{estimate.pickup_town}（変更不可）
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                顧客希望: {estimate.floor_pickup}階 / エレベーター: {estimate.has_elevator_pickup ? 'あり' : 'なし'}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">階数</label>
                                <select
                                    value={adjFloorPickup}
                                    onChange={(e) => setAdjFloorPickup(parseInt(e.target.value))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                >
                                    {Array.from({ length: 50 }, (_, i) => i + 1).map((floor) => (
                                        <option key={floor} value={floor}>{floor}階</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={adjHasElevatorPickup}
                                        onChange={(e) => setAdjHasElevatorPickup(e.target.checked)}
                                    />
                                    エレベーターあり
                                </label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditPickupModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handlePickupAdjustment} disabled={loading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* お届け先条件調整モーダル */}
                <Dialog open={editDeliveryModal} onOpenChange={setEditDeliveryModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>お届け先条件の調整</DialogTitle>
                            <DialogDescription>
                                住所: {estimate.delivery_prefecture}{estimate.delivery_city}{estimate.delivery_town}（変更不可）
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                顧客希望: {estimate.floor_delivery}階 / エレベーター: {estimate.has_elevator_delivery ? 'あり' : 'なし'}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">階数</label>
                                <select
                                    value={adjFloorDelivery}
                                    onChange={(e) => setAdjFloorDelivery(parseInt(e.target.value))}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                >
                                    {Array.from({ length: 50 }, (_, i) => i + 1).map((floor) => (
                                        <option key={floor} value={floor}>{floor}階</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={adjHasElevatorDelivery}
                                        onChange={(e) => setAdjHasElevatorDelivery(e.target.checked)}
                                    />
                                    エレベーターあり
                                </label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDeliveryModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDeliveryAdjustment} disabled={loading}>
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
                                placeholder="メモを入力..."
                                rows={4}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddMemoModal(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleMemoSubmit} disabled={memosLoading}>
                                保存する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* キャンセル確認モーダル */}
                <Dialog open={cancelModal} onOpenChange={setCancelModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>見積もりをキャンセル</DialogTitle>
                            <DialogDescription>
                                この見積もりをキャンセルしますか？この操作は取り消せません。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="text-sm text-gray-500 bg-red-50 p-3 rounded border border-red-200">
                                見積ID: {estimate?.id}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCancelModal(false)}>
                                戻る
                            </Button>
                            <Button
                                onClick={handleCancel}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                キャンセルにする
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
                            {(estimate?.adjusted_pickup_date || estimate?.adjusted_delivery_date) && (
                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                    ※調整後の日程が適用されます
                                </div>
                            )}
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
        <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-100">
            <span className="text-gray-500">{label}:</span>
            {value ? (
                <span className={`${mono ? 'font-mono' : ''} ${bold ? 'font-bold text-lg' : ''}`}>
                    {value}
                </span>
            ) : (
                <span className="text-gray-400">未登録</span>
            )}
        </div>
    );
}

// 2列表示コンポーネント（顧客希望 → 調整後）
function TwoColumnRow({
    label,
    original,
    adjusted,
}: {
    label: string;
    original: string;
    adjusted: string | null;
}) {
    const hasChange = adjusted !== null && adjusted !== original;

    return (
        <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-100">
            <span className="text-gray-500">{label}:</span>
            <div className="flex items-center gap-2">
                <span className={hasChange ? 'text-gray-400' : ''}>{original}</span>
                {hasChange && (
                    <>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="text-blue-600 font-medium">{adjusted}</span>
                    </>
                )}
            </div>
        </div>
    );
}

export default EstimateDetail;
