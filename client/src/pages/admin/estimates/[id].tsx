import { useState, useEffect, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import RequireAuth from '@/components/admin/RequireAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { useEstimates, useMemos, useMessages, useProposals, Estimate, Memo, MessageLog, AdjustmentData } from '@/hooks/useAdminApi';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Plus, Send, ArrowRight, XCircle, FileText } from 'lucide-react';

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
    invite_sent: { bg: '#DBEAFE', text: '#1E40AF' },
    applied: { bg: '#D1FAE5', text: '#065F46' },
    payment_sent: { bg: '#EDE9FE', text: '#5B21B6' },
    paid: { bg: '#A7F3D0', text: '#047857' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

// 時間帯ラベル
const timeSlotLabels: Record<string, string> = {
    morning: '午前（9:00-12:00）',
    afternoon: '午後（13:00-17:00）',
    '': '指定なし',
};

// プランラベル
const planLabels: Record<string, string> = {
    helper: 'ヘルパープラン',
    full: 'お任せプラン',
};

// メッセージ種別ラベル
const messageTypeLabels: Record<string, string> = {
    invite: '申込案内',
    payment: '決済案内',
    proposal: '再提案',
    cancel: 'キャンセル通知',
};

// フォーマット関数
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatFee = (fee?: number) => {
    if (fee === undefined || fee === null) return '-';
    return `¥${fee.toLocaleString()}`;
};

// コンポーネント
const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">{title}</h3>
            {action}
        </div>
        {children}
    </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex py-2 border-b border-gray-100 last:border-b-0">
        <span className="w-32 text-gray-500 text-sm">{label}</span>
        <span className="flex-1 text-gray-800">{value}</span>
    </div>
);

const TwoColumnRow = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-4">{children}</div>
);

export default function EstimateDetail() {
    const [, params] = useRoute('/admin/estimates/:id');
    const estimateId = params?.id;

    // Hooks
    const { getEstimate, updateStatus, updateFee, updateAdjustment, loading } = useEstimates();
    const { getMemos, addMemo } = useMemos();
    const { getLogs } = useMessages();
    const { getProposals, createProposal, sendProposal, loading: proposalLoading } = useProposals();

    // State
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);

    // Modal State
    const [editFeeModal, setEditFeeModal] = useState(false);
    const [addMemoModal, setAddMemoModal] = useState(false);
    const [sendModal, setSendModal] = useState<'invite' | 'payment' | null>(null);
    const [cancelModal, setCancelModal] = useState(false);
    const [editDateModal, setEditDateModal] = useState(false);
    const [editPlanModal, setEditPlanModal] = useState(false);
    const [editPickupModal, setEditPickupModal] = useState(false);
    const [editDeliveryModal, setEditDeliveryModal] = useState(false);
    const [proposalModal, setProposalModal] = useState(false);

    // Form State
    const [newFee, setNewFee] = useState('');
    const [feeReason, setFeeReason] = useState('');
    const [memoContent, setMemoContent] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    // Adjustment State
    const [adjPickupDate, setAdjPickupDate] = useState('');
    const [adjDeliveryDate, setAdjDeliveryDate] = useState('');
    const [adjPlan, setAdjPlan] = useState('');
    const [adjNeedsPacking, setAdjNeedsPacking] = useState(false);
    const [adjFloorPickup, setAdjFloorPickup] = useState(1);
    const [adjHasElevatorPickup, setAdjHasElevatorPickup] = useState(false);
    const [adjFloorDelivery, setAdjFloorDelivery] = useState(1);
    const [adjHasElevatorDelivery, setAdjHasElevatorDelivery] = useState(false);

    // Proposal Form
    const [proposalForm, setProposalForm] = useState({
        pickupDate: '',
        deliveryDate: '',
        pickupTimeSlot: '',
        deliveryTimeSlot: '',
        floorPickup: 1,
        hasElevatorPickup: false,
        floorDelivery: 1,
        hasElevatorDelivery: false,
        plan: 'helper',
        needsPacking: false,
        totalFee: 0,
        expresswayFee: 0,
        message: '',
    });

    // データ取得
    const fetchData = useCallback(async () => {
        if (!estimateId) return;

        const [estimateData, memosData, logsData, proposalsData] = await Promise.all([
            getEstimate(estimateId),
            getMemos(estimateId),
            getLogs(estimateId),
            getProposals(estimateId),
        ]);

        if (estimateData) setEstimate(estimateData);
        setMemos(memosData);
        setLogs(logsData);
        setProposals(proposalsData || []);
    }, [estimateId, getEstimate, getMemos, getLogs, getProposals]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 金額変更
    const handleFeeSubmit = async () => {
        if (!estimateId || !newFee) return;
        await updateFee(estimateId, parseInt(newFee), feeReason);
        setEditFeeModal(false);
        setNewFee('');
        setFeeReason('');
        fetchData();
    };

    // メモ追加
    const handleMemoSubmit = async () => {
        if (!estimateId || !memoContent) return;
        await addMemo(estimateId, memoContent);
        setAddMemoModal(false);
        setMemoContent('');
        fetchData();
    };

    // 案内送信
    const handleSend = async (type: 'invite' | 'payment') => {
        if (!estimateId) return;
        const newStatus = type === 'invite' ? 'invite_sent' : 'payment_sent';
        await updateStatus(estimateId, newStatus);
        setSendModal(null);
        fetchData();
    };

    // キャンセル
    const handleCancel = async () => {
        if (!estimateId) return;
        await updateStatus(estimateId, 'cancelled');
        setCancelModal(false);
        fetchData();
    };

    // 日程調整
    const handleDateAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjusted_pickup_date: adjPickupDate || undefined,
            adjusted_delivery_date: adjDeliveryDate || undefined,
        };
        await updateAdjustment(estimateId, data);
        setEditDateModal(false);
        fetchData();
    };

    // プラン調整
    const handlePlanAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjusted_plan: adjPlan || undefined,
            adjusted_needs_packing: adjNeedsPacking,
        };
        await updateAdjustment(estimateId, data);
        setEditPlanModal(false);
        fetchData();
    };

    // 集荷条件調整
    const handlePickupAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjusted_floor_pickup: adjFloorPickup,
            adjusted_has_elevator_pickup: adjHasElevatorPickup,
        };
        await updateAdjustment(estimateId, data);
        setEditPickupModal(false);
        fetchData();
    };

    // お届け条件調整
    const handleDeliveryAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjusted_floor_delivery: adjFloorDelivery,
            adjusted_has_elevator_delivery: adjHasElevatorDelivery,
        };
        await updateAdjustment(estimateId, data);
        setEditDeliveryModal(false);
        fetchData();
    };

    // 提案モーダルを開く
    const openProposalModal = () => {
        if (!estimate) return;
        setProposalForm({
            pickupDate: estimate.adjusted_pickup_date || estimate.pickup_date || '',
            deliveryDate: estimate.adjusted_delivery_date || estimate.delivery_date || '',
            pickupTimeSlot: estimate.pickup_time_slot || '',
            deliveryTimeSlot: estimate.delivery_time_slot || '',
            floorPickup: estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1,
            hasElevatorPickup: estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false,
            floorDelivery: estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1,
            hasElevatorDelivery: estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false,
            plan: estimate.adjusted_plan || estimate.plan || 'helper',
            needsPacking: estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false,
            totalFee: estimate.final_fee || estimate.total_fee || 0,
            expresswayFee: estimate.expressway_fee || 0,
            message: '',
        });
        setProposalModal(true);
    };

    // 提案作成・送信
    const handleCreateAndSendProposal = async () => {
        if (!estimateId) return;
        const proposal = await createProposal(estimateId, proposalForm);
        if (proposal) {
            const sent = await sendProposal(estimateId, proposal.id);
            if (sent) {
                setProposalModal(false);
                fetchData();
            }
        }
    };

    if (loading || !estimate) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    const statusStyle = statusBadgeStyles[estimate.status] || statusBadgeStyles.estimated;

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="max-w-4xl mx-auto p-4">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/admin/estimates">
                            <a className="flex items-center text-gray-600 hover:text-gray-800">
                                <ArrowLeft className="w-5 h-5 mr-1" />
                                一覧に戻る
                            </a>
                        </Link>
                        <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                        >
                            {statusLabels[estimate.status] || estimate.status}
                        </span>
                    </div>

                    {/* アクションボタン */}
                    <Section title="アクション">
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setSendModal('invite')} disabled={!estimate.line_user_id}>
                                <Send className="w-4 h-4 mr-1" />
                                申込案内を送信
                            </Button>
                            <Button onClick={() => setSendModal('payment')} disabled={!estimate.line_user_id}>
                                <Send className="w-4 h-4 mr-1" />
                                決済案内を送信
                            </Button>
                            <Button onClick={openProposalModal} disabled={!estimate.line_user_id} variant="outline">
                                <FileText className="w-4 h-4 mr-1" />
                                再提案を送信
                            </Button>
                            <Button onClick={() => setCancelModal(true)} variant="destructive">
                                <XCircle className="w-4 h-4 mr-1" />
                                キャンセル
                            </Button>
                        </div>
                    </Section>

                    {/* 基本情報 */}
                    <Section title="基本情報">
                        <InfoRow label="見積ID" value={estimate.id} />
                        <InfoRow label="作成日時" value={formatDateTime(estimate.created_at)} />
                        <InfoRow label="LINE連携" value={estimate.line_user_id ? '連携済み' : '未連携'} />
                    </Section>

                    {/* 日程 */}
                    <Section
                        title="日程"
                        action={
                            <Button size="sm" variant="ghost" onClick={() => {
                                setAdjPickupDate(estimate.adjusted_pickup_date || estimate.pickup_date || '');
                                setAdjDeliveryDate(estimate.adjusted_delivery_date || estimate.delivery_date || '');
                                setEditDateModal(true);
                            }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        }
                    >
                        <TwoColumnRow>
                            <div>
                                <InfoRow label="集荷日" value={formatDate(estimate.adjusted_pickup_date || estimate.pickup_date)} />
                                <InfoRow label="集荷時間" value={timeSlotLabels[estimate.pickup_time_slot || ''] || '指定なし'} />
                            </div>
                            <div>
                                <InfoRow label="お届け日" value={formatDate(estimate.adjusted_delivery_date || estimate.delivery_date)} />
                                <InfoRow label="お届け時間" value={timeSlotLabels[estimate.delivery_time_slot || ''] || '指定なし'} />
                            </div>
                        </TwoColumnRow>
                    </Section>

                    {/* プラン・オプション */}
                    <Section
                        title="プラン・オプション"
                        action={
                            <Button size="sm" variant="ghost" onClick={() => {
                                setAdjPlan(estimate.adjusted_plan || estimate.plan || 'helper');
                                setAdjNeedsPacking(estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false);
                                setEditPlanModal(true);
                            }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        }
                    >
                        <InfoRow label="プラン" value={planLabels[estimate.adjusted_plan || estimate.plan || ''] || 'ヘルパープラン'} />
                        <InfoRow label="梱包サービス" value={(estimate.adjusted_needs_packing ?? estimate.needs_packing) ? '利用する' : '利用しない'} />
                    </Section>

                    {/* 集荷先 */}
                    <Section
                        title="集荷先"
                        action={
                            <Button size="sm" variant="ghost" onClick={() => {
                                setAdjFloorPickup(estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1);
                                setAdjHasElevatorPickup(estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false);
                                setEditPickupModal(true);
                            }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        }
                    >
                        <InfoRow label="住所" value={`${estimate.pickup_prefecture || ''}${estimate.pickup_city || ''}${estimate.pickup_town || ''}`} />
                        <InfoRow label="階数" value={`${estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1}階`} />
                        <InfoRow label="エレベーター" value={(estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup) ? 'あり' : 'なし'} />
                    </Section>

                    {/* お届け先 */}
                    <Section
                        title="お届け先"
                        action={
                            <Button size="sm" variant="ghost" onClick={() => {
                                setAdjFloorDelivery(estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1);
                                setAdjHasElevatorDelivery(estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false);
                                setEditDeliveryModal(true);
                            }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        }
                    >
                        <InfoRow label="住所" value={`${estimate.delivery_prefecture || ''}${estimate.delivery_city || ''}${estimate.delivery_town || ''}`} />
                        <InfoRow label="階数" value={`${estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1}階`} />
                        <InfoRow label="エレベーター" value={(estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery) ? 'あり' : 'なし'} />
                    </Section>

                    {/* 金額 */}
                    <Section
                        title="金額"
                        action={
                            <Button size="sm" variant="ghost" onClick={() => {
                                setNewFee(String(estimate.final_fee || estimate.total_fee || ''));
                                setFeeReason('');
                                setEditFeeModal(true);
                            }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        }
                    >
                        <InfoRow label="見積金額" value={formatFee(estimate.total_fee)} />
                        <InfoRow label="距離" value={estimate.distance_km ? `${estimate.distance_km}km` : '-'} />
                        <InfoRow label="高速料金" value={estimate.expressway_fee ? formatFee(estimate.expressway_fee) : '¥0'} />
                        {estimate.final_fee && (
                            <InfoRow label="最終金額" value={<span className="font-bold text-lg">{formatFee(estimate.final_fee)}</span>} />
                        )}
                        {estimate.fee_change_reason && (
                            <InfoRow label="変更理由" value={estimate.fee_change_reason} />
                        )}
                    </Section>

                    {/* 連絡先 */}
                    {(estimate.last_name || estimate.phone) && (
                        <Section title="連絡先">
                            <InfoRow label="氏名" value={`${estimate.last_name || ''} ${estimate.first_name || ''}`} />
                            <InfoRow label="電話番号" value={estimate.phone || '-'} />
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
                            <Button size="sm" variant="ghost" onClick={() => setAddMemoModal(true)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        }
                    >
                        {memos.length === 0 ? (
                            <p className="text-gray-400 text-sm">メモはありません</p>
                        ) : (
                            <div className="space-y-2">
                                {memos.map((memo) => (
                                    <div key={memo.id} className="bg-gray-50 p-3 rounded">
                                        <p className="text-gray-700">{memo.content}</p>
                                        <p className="text-gray-400 text-xs mt-1">{formatDateTime(memo.created_at)}</p>
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
                                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span>{messageTypeLabels[log.message_type] || log.message_type}</span>
                                        <span className="text-gray-400 text-sm">{formatDateTime(log.sent_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* 提案履歴 */}
                    {proposals.length > 0 && (
                        <Section title="提案履歴">
                            <div className="space-y-2">
                                {proposals.map((proposal) => (
                                    <div key={proposal.id} className="bg-gray-50 p-3 rounded">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">提案 #{proposal.proposal_number}</span>
                                            <span className="text-gray-400 text-sm">{formatDateTime(proposal.created_at)}</span>
                                        </div>
                                        <p className="text-gray-700 mt-1">{formatFee(proposal.total_fee)}</p>
                                        {proposal.message && (
                                            <p className="text-gray-500 text-sm mt-1">{proposal.message}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* 金額編集モーダル */}
                    <Dialog open={editFeeModal} onOpenChange={setEditFeeModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>金額を変更</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">新しい金額</label>
                                    <Input
                                        type="number"
                                        value={newFee}
                                        onChange={(e) => setNewFee(e.target.value)}
                                        placeholder="例: 25000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">変更理由</label>
                                    <Textarea
                                        value={feeReason}
                                        onChange={(e) => setFeeReason(e.target.value)}
                                        placeholder="例: 繁忙期割引適用"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditFeeModal(false)}>キャンセル</Button>
                                <Button onClick={handleFeeSubmit}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 日程編集モーダル */}
                    <Dialog open={editDateModal} onOpenChange={setEditDateModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>日程を調整</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">集荷日</label>
                                    <Input
                                        type="date"
                                        value={adjPickupDate}
                                        onChange={(e) => setAdjPickupDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">お届け日</label>
                                    <Input
                                        type="date"
                                        value={adjDeliveryDate}
                                        onChange={(e) => setAdjDeliveryDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditDateModal(false)}>キャンセル</Button>
                                <Button onClick={handleDateAdjustment}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* プラン編集モーダル */}
                    <Dialog open={editPlanModal} onOpenChange={setEditPlanModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>プラン・オプションを調整</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">プラン</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjPlan}
                                        onChange={(e) => setAdjPlan(e.target.value)}
                                    >
                                        <option value="helper">ヘルパープラン</option>
                                        <option value="full">お任せプラン</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="needsPacking"
                                        checked={adjNeedsPacking}
                                        onChange={(e) => setAdjNeedsPacking(e.target.checked)}
                                    />
                                    <label htmlFor="needsPacking">梱包サービスを利用する</label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditPlanModal(false)}>キャンセル</Button>
                                <Button onClick={handlePlanAdjustment}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 集荷条件編集モーダル */}
                    <Dialog open={editPickupModal} onOpenChange={setEditPickupModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>集荷先条件を調整</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">階数</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjFloorPickup}
                                        onChange={(e) => setAdjFloorPickup(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                            <option key={n} value={n}>{n}階</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="hasElevatorPickup"
                                        checked={adjHasElevatorPickup}
                                        onChange={(e) => setAdjHasElevatorPickup(e.target.checked)}
                                    />
                                    <label htmlFor="hasElevatorPickup">エレベーターあり</label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditPickupModal(false)}>キャンセル</Button>
                                <Button onClick={handlePickupAdjustment}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* お届け条件編集モーダル */}
                    <Dialog open={editDeliveryModal} onOpenChange={setEditDeliveryModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>お届け先条件を調整</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">階数</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjFloorDelivery}
                                        onChange={(e) => setAdjFloorDelivery(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                            <option key={n} value={n}>{n}階</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="hasElevatorDelivery"
                                        checked={adjHasElevatorDelivery}
                                        onChange={(e) => setAdjHasElevatorDelivery(e.target.checked)}
                                    />
                                    <label htmlFor="hasElevatorDelivery">エレベーターあり</label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditDeliveryModal(false)}>キャンセル</Button>
                                <Button onClick={handleDeliveryAdjustment}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* メモ追加モーダル */}
                    <Dialog open={addMemoModal} onOpenChange={setAddMemoModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>メモを追加</DialogTitle>
                            </DialogHeader>
                            <Textarea
                                value={memoContent}
                                onChange={(e) => setMemoContent(e.target.value)}
                                placeholder="メモを入力..."
                                rows={4}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddMemoModal(false)}>キャンセル</Button>
                                <Button onClick={handleMemoSubmit}>追加</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 送信確認モーダル */}
                    <Dialog open={sendModal !== null} onOpenChange={() => setSendModal(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {sendModal === 'invite' ? '申込案内を送信' : '決済案内を送信'}
                                </DialogTitle>
                                <DialogDescription>
                                    LINEで{sendModal === 'invite' ? '申込案内' : '決済案内'}を送信します。よろしいですか？
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSendModal(null)}>キャンセル</Button>
                                <Button onClick={() => sendModal && handleSend(sendModal)}>送信</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* キャンセル確認モーダル */}
                    <Dialog open={cancelModal} onOpenChange={setCancelModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>キャンセル確認</DialogTitle>
                                <DialogDescription>
                                    この見積もりをキャンセルします。よろしいですか？
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCancelModal(false)}>戻る</Button>
                                <Button variant="destructive" onClick={handleCancel}>キャンセルする</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 提案モーダル */}
                    <Dialog open={proposalModal} onOpenChange={setProposalModal}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>再提案を作成・送信</DialogTitle>
                                <DialogDescription>
                                    修正した見積もり内容をLINEで送信します
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">集荷日</label>
                                        <Input
                                            type="date"
                                            value={proposalForm.pickupDate}
                                            onChange={(e) => setProposalForm({ ...proposalForm, pickupDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">お届け日</label>
                                        <Input
                                            type="date"
                                            value={proposalForm.deliveryDate}
                                            onChange={(e) => setProposalForm({ ...proposalForm, deliveryDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">集荷時間</label>
                                        <select
                                            className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                            value={proposalForm.pickupTimeSlot}
                                            onChange={(e) => setProposalForm({ ...proposalForm, pickupTimeSlot: e.target.value })}
                                        >
                                            <option value="">指定なし</option>
                                            <option value="morning">午前（9:00-12:00）</option>
                                            <option value="afternoon">午後（13:00-17:00）</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">お届け時間</label>
                                        <select
                                            className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                            value={proposalForm.deliveryTimeSlot}
                                            onChange={(e) => setProposalForm({ ...proposalForm, deliveryTimeSlot: e.target.value })}
                                        >
                                            <option value="">指定なし</option>
                                            <option value="morning">午前（9:00-12:00）</option>
                                            <option value="afternoon">午後（13:00-17:00）</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">プラン</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={proposalForm.plan}
                                        onChange={(e) => setProposalForm({ ...proposalForm, plan: e.target.value })}
                                    >
                                        <option value="helper">ヘルパープラン</option>
                                        <option value="full">お任せプラン</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="proposalNeedsPacking"
                                        checked={proposalForm.needsPacking}
                                        onChange={(e) => setProposalForm({ ...proposalForm, needsPacking: e.target.checked })}
                                    />
                                    <label htmlFor="proposalNeedsPacking">梱包サービスを利用する</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">提案金額</label>
                                    <Input
                                        type="number"
                                        value={proposalForm.totalFee}
                                        onChange={(e) => setProposalForm({ ...proposalForm, totalFee: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">メッセージ（任意）</label>
                                    <Textarea
                                        value={proposalForm.message}
                                        onChange={(e) => setProposalForm({ ...proposalForm, message: e.target.value })}
                                        placeholder="例: 日程を調整しました。ご確認ください。"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setProposalModal(false)}>キャンセル</Button>
                                <Button onClick={handleCreateAndSendProposal} disabled={proposalLoading}>
                                    {proposalLoading ? '送信中...' : '作成して送信'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </AdminLayout>
        </RequireAuth>
    );
}
