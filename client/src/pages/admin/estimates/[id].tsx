import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useEstimates, useMemos, useMessages, useProposals, useActionLogs, Estimate, Memo, MessageLog, AdjustmentData } from '@/hooks/useAdminApi';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Plus, Send, XCircle, FileText, User, Calendar, MapPin, CreditCard, Truck, Package, Trash2 } from 'lucide-react';

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
    morning: '午前',
    afternoon: '午後',
    anytime: 'どちらでも',
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
    if (fee === undefined || fee === null) return '¥0';
    return `¥${fee.toLocaleString()}`;
};

// セクションコンポーネント
const Section = ({ title, children, action, icon }: { title: string; children: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-bold text-gray-800">{title}</h3>
            </div>
            {action}
        </div>
        {children}
    </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex py-2 border-b border-gray-100 last:border-b-0">
        <span className="w-32 text-gray-500 text-sm flex-shrink-0">{label}</span>
        <span className="flex-1 text-gray-800 break-words">{value}</span>
    </div>
);

// 料金内訳の型定義
interface FeeBreakdown {
    baseFee: number;
    planFee: number;
    packingFee: number;
    timeSlotFee: number;
    weekendHolidayFee: number;
    floorPickupFee: number;
    floorDeliveryFee: number;
    storageFee: number;
    busySeasonFee: number;
    expresswayFee: number;
    distanceFee: number;
}

// 料金内訳ラベル
const feeLabels: Record<keyof FeeBreakdown, string> = {
    baseFee: '基本料金',
    planFee: 'お任せプラン',
    packingFee: '梱包サービス',
    timeSlotFee: '時間指定',
    weekendHolidayFee: '土日祝加算',
    floorPickupFee: '集荷先階数料金',
    floorDeliveryFee: '届け先階数料金',
    storageFee: '積み置き料金',
    busySeasonFee: '繁忙期加算',
    expresswayFee: '高速道路料金',
    distanceFee: '距離超過料金',
};

// 顧客カルテコンポーネント（編集可能版）
const CustomerCard = ({
    estimate,
    onEdit,
    editable = true,
    title = "顧客カルテ",
    proposalNumber,
    sentAt,
}: {
    estimate: Estimate;
    onEdit?: (field: string) => void;
    editable?: boolean;
    title?: string;
    proposalNumber?: number;
    sentAt?: string;
}) => {
    const pickupDate = estimate.adjusted_pickup_date || estimate.pickup_date;
    const deliveryDate = estimate.adjusted_delivery_date || estimate.delivery_date;
    const plan = estimate.adjusted_plan || estimate.plan || 'helper';
    const needsPacking = estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false;
    const floorPickup = estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1;
    const hasElevatorPickup = estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false;
    const floorDelivery = estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1;
    const hasElevatorDelivery = estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false;
    const totalFee = estimate.final_fee || estimate.total_fee || 0;

    // 氏名
    const fullName = estimate.last_name || estimate.first_name
        ? `${estimate.last_name || ''} ${estimate.first_name || ''}`.trim()
        : null;
    const fullNameKana = estimate.last_name_kana || estimate.first_name_kana
        ? `${estimate.last_name_kana || ''} ${estimate.first_name_kana || ''}`.trim()
        : null;

    // 集荷先住所
    const pickupAddress = `${estimate.pickup_prefecture || ''}${estimate.pickup_city || ''}${estimate.pickup_town || ''}`;
    const pickupDetail = [estimate.pickup_address_detail, estimate.pickup_building].filter(Boolean).join(' ');

    // お届け先住所
    const deliveryAddress = `${estimate.delivery_prefecture || ''}${estimate.delivery_city || ''}${estimate.delivery_town || ''}`;
    const deliveryDetail = [estimate.delivery_address_detail, estimate.delivery_building].filter(Boolean).join(' ');

    return (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-5 mb-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-lg text-gray-800">
                        {title}
                        {proposalNumber && <span className="ml-2 text-orange-600">#{proposalNumber}</span>}
                    </h3>
                </div>
                {sentAt && (
                    <span className="text-sm text-gray-500">{formatDateTime(sentAt)}</span>
                )}
            </div>

            {/* 作成日時 */}
            {estimate.created_at && (
                <div className="bg-white rounded-lg p-3 mb-4 border border-orange-100">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">作成日時</span>
                        <span className="font-medium">{formatDateTime(estimate.created_at)}</span>
                    </div>
                </div>
            )}

            {/* お客様情報 */}
            {(fullName || estimate.phone) && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">お客様情報</span>
                    </div>
                    <div className="space-y-2">
                        {fullName && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">氏名</span>
                                <span className="font-medium">{fullName}</span>
                            </div>
                        )}
                        {fullNameKana && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">フリガナ</span>
                                <span className="text-sm">{fullNameKana}</span>
                            </div>
                        )}
                        {estimate.phone && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">電話番号</span>
                                <span className="font-medium">{estimate.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 金額 */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-orange-600" />
                        <span className="text-gray-600">お見積もり金額</span>
                    </div>
                    {editable && onEdit && (
                        <button onClick={() => onEdit('fee')} className="text-gray-400 hover:text-orange-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="text-3xl font-bold text-orange-600 mt-2">{formatFee(totalFee)}</div>

                {/* 料金内訳 - 全項目を表示 */}
                <div className="mt-3 pt-3 border-t border-orange-100 space-y-1">
                    <div className="text-sm font-medium text-gray-700 mb-2">料金内訳</div>

                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">基本料金</span>
                        <span className="font-medium">{formatFee(estimate.base_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">お任せプラン</span>
                        <span className="font-medium">{formatFee(estimate.plan_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">梱包サービス</span>
                        <span className="font-medium">{formatFee(estimate.packing_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">時間指定</span>
                        <span className="font-medium">{formatFee(estimate.time_slot_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">土日祝加算</span>
                        <span className="font-medium">{formatFee(estimate.weekend_holiday_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">集荷先階数料金</span>
                        <span className="font-medium">{formatFee(estimate.floor_pickup_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">届け先階数料金</span>
                        <span className="font-medium">{formatFee(estimate.floor_delivery_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">積み置き料金</span>
                        <span className="font-medium">{formatFee(estimate.storage_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">繁忙期加算</span>
                        <span className="font-medium">{formatFee(estimate.busy_season_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">高速道路料金</span>
                        <span className="font-medium">{formatFee(estimate.expressway_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">距離超過料金</span>
                        <span className="font-medium">{formatFee(estimate.distance_fee || 0)}</span>
                    </div>
                </div>
            </div>

            {/* 日程 */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">日程</span>
                    </div>
                    {editable && onEdit && (
                        <button onClick={() => onEdit('date')} className="text-gray-400 hover:text-orange-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">集荷日</div>
                        <div className="font-medium">{formatDate(pickupDate)}</div>
                        <div className="text-sm text-gray-600">{timeSlotLabels[estimate.pickup_time_slot || ''] || 'どちらでも'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">お届け日</div>
                        <div className="font-medium">{formatDate(deliveryDate)}</div>
                        <div className="text-sm text-gray-600">{timeSlotLabels[estimate.delivery_time_slot || ''] || 'どちらでも'}</div>
                    </div>
                </div>
            </div>

            {/* プラン・オプション */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">プラン・オプション</span>
                    </div>
                    {editable && onEdit && (
                        <button onClick={() => onEdit('plan')} className="text-gray-400 hover:text-orange-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">プラン</span>
                        <span className="font-medium">{planLabels[plan] || 'ヘルパープラン'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">梱包サービス</span>
                        <span className="font-medium">{needsPacking ? '利用する' : '利用しない'}</span>
                    </div>
                </div>
            </div>

            {/* 集荷先 */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">集荷先</span>
                    </div>
                    {editable && onEdit && (
                        <button onClick={() => onEdit('pickup')} className="text-gray-400 hover:text-orange-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="font-medium break-words">{pickupAddress || '-'}</div>
                    {pickupDetail && (
                        <div className="text-sm text-gray-700 break-words">{pickupDetail}</div>
                    )}
                    <div className="text-sm text-gray-600">
                        {floorPickup}階 / エレベーター：{hasElevatorPickup ? 'あり' : 'なし'}
                    </div>
                </div>
            </div>

            {/* お届け先 */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">お届け先</span>
                    </div>
                    {editable && onEdit && (
                        <button onClick={() => onEdit('delivery')} className="text-gray-400 hover:text-orange-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="font-medium break-words">{deliveryAddress || '-'}</div>
                    {deliveryDetail && (
                        <div className="text-sm text-gray-700 break-words">{deliveryDetail}</div>
                    )}
                    <div className="text-sm text-gray-600">
                        {floorDelivery}階 / エレベーター：{hasElevatorDelivery ? 'あり' : 'なし'}
                    </div>
                </div>
            </div>

            {/* 備考 */}
            {estimate.notes && (
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">備考</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm break-words">{estimate.notes}</p>
                </div>
            )}
        </div>
    );
};

// 提案カードコンポーネント（履歴表示用）
const ProposalCard = ({ proposal }: { proposal: any }) => {
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">提案 #{proposal.proposal_number}</span>
                </div>
                <span className="text-sm text-gray-500">{formatDateTime(proposal.created_at)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-gray-500">金額：</span>
                    <span className="font-medium">{formatFee(proposal.total_fee)}</span>
                </div>
                <div>
                    <span className="text-gray-500">プラン：</span>
                    <span>{planLabels[proposal.plan] || 'ヘルパープラン'}</span>
                </div>
                <div>
                    <span className="text-gray-500">集荷日：</span>
                    <span>{formatDate(proposal.pickup_date)}</span>
                </div>
                <div>
                    <span className="text-gray-500">お届け日：</span>
                    <span>{formatDate(proposal.delivery_date)}</span>
                </div>
            </div>

            {proposal.message && (
                <div className="mt-3 p-2 bg-white rounded border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">メッセージ</div>
                    <div className="text-sm break-words">{proposal.message}</div>
                </div>
            )}
        </div>
    );
};

export default function EstimateDetail() {
    const [, params] = useRoute('/admin/estimates/:id');
    const estimateId = params?.id;

    // Hooks
    const { getEstimate, updateStatus, updateFee, updateAdjustment, loading } = useEstimates();
    const { getMemos, addMemo, updateMemo, deleteMemo } = useMemos();
    const { getLogs, sendInvite, sendPayment } = useMessages();
    const { getProposals, createProposal, sendProposal, loading: proposalLoading } = useProposals();
    const { getActionLogs } = useActionLogs();

    // State
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [actionLogs, setActionLogs] = useState<any[]>([]);

    // Modal State
    const [editFeeModal, setEditFeeModal] = useState(false);
    const [addMemoModal, setAddMemoModal] = useState(false);
    const [editMemoModal, setEditMemoModal] = useState(false);
    const [deleteMemoModal, setDeleteMemoModal] = useState(false);
    const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
    const [sendModal, setSendModal] = useState<'invite' | 'payment' | null>(null);
    const [cancelModal, setCancelModal] = useState(false);
    const [editDateModal, setEditDateModal] = useState(false);
    const [editPlanModal, setEditPlanModal] = useState(false);
    const [editPickupModal, setEditPickupModal] = useState(false);
    const [editDeliveryModal, setEditDeliveryModal] = useState(false);
    const [proposalMessageModal, setProposalMessageModal] = useState(false);

    // 料金内訳 State
    const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown>({
        baseFee: 0,
        planFee: 0,
        packingFee: 0,
        timeSlotFee: 0,
        weekendHolidayFee: 0,
        floorPickupFee: 0,
        floorDeliveryFee: 0,
        storageFee: 0,
        busySeasonFee: 0,
        expresswayFee: 0,
        distanceFee: 0,
    });
    const [feeReason, setFeeReason] = useState('');
    const [memoContent, setMemoContent] = useState('');
    const [proposalMessage, setProposalMessage] = useState('');

    // Adjustment State
    const [adjPickupDate, setAdjPickupDate] = useState('');
    const [adjDeliveryDate, setAdjDeliveryDate] = useState('');
    const [adjPlan, setAdjPlan] = useState('');
    const [adjNeedsPacking, setAdjNeedsPacking] = useState(false);
    const [adjFloorPickup, setAdjFloorPickup] = useState(1);
    const [adjHasElevatorPickup, setAdjHasElevatorPickup] = useState(false);
    const [adjFloorDelivery, setAdjFloorDelivery] = useState(1);
    const [adjHasElevatorDelivery, setAdjHasElevatorDelivery] = useState(false);

    // 合計金額を自動計算
    const calculatedTotal = useMemo(() => {
        return Object.values(feeBreakdown).reduce((sum, val) => sum + (val || 0), 0);
    }, [feeBreakdown]);

    // データ取得
    const fetchData = useCallback(async () => {
        if (!estimateId) return;

        const [estimateData, memosData, logsData, proposalsData, actionLogsData] = await Promise.all([
            getEstimate(estimateId),
            getMemos(estimateId),
            getLogs(estimateId),
            getProposals(estimateId),
            getActionLogs(estimateId),
        ]);

        if (estimateData) setEstimate(estimateData);
        setMemos(memosData);
        setLogs(logsData);
        setProposals(proposalsData || []);
        setActionLogs(actionLogsData || []);
    }, [estimateId, getEstimate, getMemos, getLogs, getProposals, getActionLogs]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 料金内訳の個別更新
    const updateFeeItem = (key: keyof FeeBreakdown, value: string) => {
        const numValue = parseInt(value) || 0;
        setFeeBreakdown(prev => ({ ...prev, [key]: numValue }));
    };

    // カルテの編集ハンドラー
    const handleCardEdit = (field: string) => {
        if (!estimate) return;

        switch (field) {
            case 'fee':
                setFeeBreakdown({
                    baseFee: estimate.base_fee || 0,
                    planFee: estimate.plan_fee || 0,
                    packingFee: estimate.packing_fee || 0,
                    timeSlotFee: estimate.time_slot_fee || 0,
                    weekendHolidayFee: estimate.weekend_holiday_fee || 0,
                    floorPickupFee: estimate.floor_pickup_fee || 0,
                    floorDeliveryFee: estimate.floor_delivery_fee || 0,
                    storageFee: estimate.storage_fee || 0,
                    busySeasonFee: estimate.busy_season_fee || 0,
                    expresswayFee: estimate.expressway_fee || 0,
                    distanceFee: estimate.distance_fee || 0,
                });
                setFeeReason('');
                setEditFeeModal(true);
                break;
            case 'date':
                setAdjPickupDate(estimate.adjusted_pickup_date || estimate.pickup_date || '');
                setAdjDeliveryDate(estimate.adjusted_delivery_date || estimate.delivery_date || '');
                setEditDateModal(true);
                break;
            case 'plan':
                setAdjPlan(estimate.adjusted_plan || estimate.plan || 'helper');
                setAdjNeedsPacking(estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false);
                setEditPlanModal(true);
                break;
            case 'pickup':
                setAdjFloorPickup(estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1);
                setAdjHasElevatorPickup(estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false);
                setEditPickupModal(true);
                break;
            case 'delivery':
                setAdjFloorDelivery(estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1);
                setAdjHasElevatorDelivery(estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false);
                setEditDeliveryModal(true);
                break;
        }
    };

    // 金額変更（内訳から合計を計算して保存）
    const handleFeeSubmit = async () => {
        if (!estimateId) return;
        await updateFee(estimateId, calculatedTotal, feeReason, feeBreakdown.expresswayFee, feeBreakdown);
        setEditFeeModal(false);
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

    // メモ編集
    const handleMemoUpdate = async () => {
        if (!estimateId || !selectedMemo || !memoContent) return;
        await updateMemo(estimateId, selectedMemo.id, memoContent);
        setEditMemoModal(false);
        setSelectedMemo(null);
        setMemoContent('');
        fetchData();
    };

    // メモ削除
    const handleMemoDelete = async () => {
        if (!estimateId || !selectedMemo) return;
        await deleteMemo(estimateId, selectedMemo.id);
        setDeleteMemoModal(false);
        setSelectedMemo(null);
        fetchData();
    };

    // メモ編集モーダルを開く
    const openEditMemoModal = (memo: Memo) => {
        setSelectedMemo(memo);
        setMemoContent(memo.content);
        setEditMemoModal(true);
    };

    // メモ削除モーダルを開く
    const openDeleteMemoModal = (memo: Memo) => {
        setSelectedMemo(memo);
        setDeleteMemoModal(true);
    };

    // 案内送信
    const handleSend = async (type: 'invite' | 'payment') => {
        if (!estimateId) return;

        let success = false;
        if (type === 'invite') {
            success = await sendInvite(estimateId);
        } else {
            success = await sendPayment(estimateId);
        }

        if (success) {
            setSendModal(null);
            fetchData();
        }
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

    // 再提案を送信
    const handleSendProposal = async () => {
        if (!estimateId || !estimate) return;

        const proposalData = {
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
            message: proposalMessage,
        };

        const proposal = await createProposal(estimateId, proposalData);
        if (proposal) {
            const sent = await sendProposal(estimateId, proposal.id);
            if (sent) {
                setProposalMessageModal(false);
                setProposalMessage('');
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
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => setSendModal('invite')}
                                disabled={!estimate.line_user_id}
                                className="w-full"
                                size="sm"
                            >
                                <Send className="w-4 h-4 mr-1" />
                                申込案内
                            </Button>
                            <Button
                                onClick={() => setSendModal('payment')}
                                disabled={!estimate.line_user_id}
                                className="w-full"
                                size="sm"
                            >
                                <Send className="w-4 h-4 mr-1" />
                                決済案内
                            </Button>
                            <Button
                                onClick={() => setProposalMessageModal(true)}
                                disabled={!estimate.line_user_id}
                                variant="outline"
                                className="w-full"
                                size="sm"
                            >
                                <FileText className="w-4 h-4 mr-1" />
                                再提案
                            </Button>
                            <Button
                                onClick={() => setCancelModal(true)}
                                variant="destructive"
                                className="w-full"
                                size="sm"
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                キャンセル
                            </Button>
                        </div>
                    </Section>

                    {/* 基本情報 */}
                    <Section title="基本情報">
                        <InfoRow label="見積ID" value={estimate.id} />
                        <InfoRow label="LINE連携" value={estimate.line_user_id ? '連携済み' : '未連携'} />
                    </Section>

                    {/* 顧客カルテ（編集可能） */}
                    <CustomerCard
                        estimate={estimate}
                        onEdit={handleCardEdit}
                        editable={true}
                        title="顧客カルテ"
                    />

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
                                        <div className="flex justify-between items-start">
                                            <p className="text-gray-700 flex-1 break-words">{memo.content}</p>
                                            <div className="flex gap-1 ml-2 flex-shrink-0">
                                                <button
                                                    onClick={() => openEditMemoModal(memo)}
                                                    className="text-gray-400 hover:text-blue-600 p-1"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteMemoModal(memo)}
                                                    className="text-gray-400 hover:text-red-600 p-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1">{formatDateTime(memo.created_at)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* アクション履歴 */}
                    <Section title="アクション履歴">
                        {actionLogs.length === 0 ? (
                            <p className="text-gray-400 text-sm">アクション履歴はありません</p>
                        ) : (
                            <div className="space-y-2">
                                {actionLogs.map((log) => (
                                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-700 break-words flex-1">{log.description || log.action_type}</span>
                                        <span className="text-gray-400 text-sm flex-shrink-0 ml-2">{formatDateTime(log.created_at)}</span>
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
                    <Section title="提案履歴" icon={<FileText className="w-5 h-5 text-gray-600" />}>
                        {proposals.length === 0 ? (
                            <p className="text-gray-400 text-sm">提案履歴はありません</p>
                        ) : (
                            <div className="space-y-3">
                                {[...proposals].reverse().map((proposal) => (
                                    <ProposalCard key={proposal.id} proposal={proposal} />
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* ===== モーダル群 ===== */}

                    {/* 金額編集モーダル（内訳編集版） */}
                    <Dialog open={editFeeModal} onOpenChange={setEditFeeModal}>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>金額を変更</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                                {(Object.keys(feeLabels) as Array<keyof FeeBreakdown>).map((key) => (
                                    <div key={key} className="grid grid-cols-[140px_1fr] gap-2 items-center">
                                        <label className="text-sm text-gray-700 truncate">
                                            {feeLabels[key]}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={feeBreakdown[key] || ''}
                                                onChange={(e) => updateFeeItem(key, e.target.value)}
                                                placeholder="0"
                                                className="pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                                円
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>合計金額</span>
                                        <span className="text-orange-600">{formatFee(calculatedTotal)}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">変更理由</label>
                                    <Textarea
                                        value={feeReason}
                                        onChange={(e) => setFeeReason(e.target.value)}
                                        placeholder="例: 繁忙期割引適用"
                                        rows={2}
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">梱包サービス</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjNeedsPacking ? 'true' : 'false'}
                                        onChange={(e) => setAdjNeedsPacking(e.target.value === 'true')}
                                    >
                                        <option value="false">利用しない</option>
                                        <option value="true">利用する</option>
                                    </select>
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">エレベーター</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjHasElevatorPickup ? 'true' : 'false'}
                                        onChange={(e) => setAdjHasElevatorPickup(e.target.value === 'true')}
                                    >
                                        <option value="false">なし</option>
                                        <option value="true">あり</option>
                                    </select>
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">エレベーター</label>
                                    <select
                                        className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                        value={adjHasElevatorDelivery ? 'true' : 'false'}
                                        onChange={(e) => setAdjHasElevatorDelivery(e.target.value === 'true')}
                                    >
                                        <option value="false">なし</option>
                                        <option value="true">あり</option>
                                    </select>
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

                    {/* メモ編集モーダル */}
                    <Dialog open={editMemoModal} onOpenChange={setEditMemoModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>メモを編集</DialogTitle>
                            </DialogHeader>
                            <Textarea
                                value={memoContent}
                                onChange={(e) => setMemoContent(e.target.value)}
                                placeholder="メモを入力..."
                                rows={4}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditMemoModal(false)}>キャンセル</Button>
                                <Button onClick={handleMemoUpdate}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* メモ削除確認モーダル */}
                    <Dialog open={deleteMemoModal} onOpenChange={setDeleteMemoModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>メモを削除</DialogTitle>
                                <DialogDescription>
                                    このメモを削除します。よろしいですか？
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteMemoModal(false)}>キャンセル</Button>
                                <Button variant="destructive" onClick={handleMemoDelete}>削除</Button>
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

                    {/* 再提案メッセージモーダル */}
                    <Dialog open={proposalMessageModal} onOpenChange={setProposalMessageModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>再提案を送信</DialogTitle>
                                <DialogDescription>
                                    現在の顧客カルテの内容でLINEに再提案を送信します。
                                    メッセージを添えることもできます。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                    <div><strong>金額:</strong> {formatFee(estimate.final_fee || estimate.total_fee)}</div>
                                    <div><strong>集荷日:</strong> {formatDate(estimate.adjusted_pickup_date || estimate.pickup_date)}</div>
                                    <div><strong>お届け日:</strong> {formatDate(estimate.adjusted_delivery_date || estimate.delivery_date)}</div>
                                    <div><strong>プラン:</strong> {planLabels[estimate.adjusted_plan || estimate.plan || ''] || 'ヘルパープラン'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">メッセージ（任意）</label>
                                    <Textarea
                                        value={proposalMessage}
                                        onChange={(e) => setProposalMessage(e.target.value)}
                                        placeholder="例: 日程を調整しました。ご確認ください。"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setProposalMessageModal(false)}>キャンセル</Button>
                                <Button onClick={handleSendProposal} disabled={proposalLoading}>
                                    {proposalLoading ? '送信中...' : '送信する'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </AdminLayout>
        </RequireAuth>
    );
}
