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
    estimated: '概算見積完了',
    photo_diagnosis: '写真診断中',
    consulting: '日程調整中',
    invite_sent: '申込案内送信済み',
    applied: '申込完了',
    payment_sent: '決済案内送信済み',
    paid: '決済完了',
    cancelled: 'キャンセル',
};

// ステータスバッジスタイル
const statusBadgeStyles: Record<string, { bg: string; text: string }> = {
    estimated: { bg: 'bg-gray-100', text: 'text-gray-800' },
    photo_diagnosis: { bg: 'bg-purple-100', text: 'text-purple-800' },
    consulting: { bg: 'bg-blue-100', text: 'text-blue-800' },
    invite_sent: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    applied: { bg: 'bg-green-100', text: 'text-green-800' },
    payment_sent: { bg: 'bg-orange-100', text: 'text-orange-800' },
    paid: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};



// ステッププログレスバー
const statusStepMap: Record<string, number> = {
    estimated: 1,
    photo_diagnosis: 1,
    consulting: 2,
    invite_sent: 2,
    applied: 3,
    payment_sent: 3,
    paid: 4,
    cancelled: 0,
};

const stepLabels = ['概算見積', '日程調整', '本申込', '決済完了'];

function StatusProgressBar({ status }: { status: string }) {
    const currentStep = statusStepMap[status] || 1;
    const isCancelled = status === 'cancelled';

    if (isCancelled) {
        return (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                キャンセル
            </span>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center w-full">
                {stepLabels.map((label, i) => {
                    const step = i + 1;
                    const isCompleted = step < currentStep;
                    const isCurrent = step === currentStep;

                    return (
                        <div key={step} className={step < 4 ? 'flex items-center flex-1' : 'flex items-center'}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                                        isCompleted
                                            ? 'bg-yellow-400 border-yellow-500 text-white'
                                            : isCurrent
                                            ? 'bg-yellow-400 border-yellow-500 text-white ring-2 ring-yellow-200'
                                            : 'bg-gray-100 border-gray-300 text-gray-400'
                                    }`}
                                >
                                    {isCompleted ? '\u2713' : step}
                                </div>
                                <span
                                    className={`text-xs mt-1.5 whitespace-nowrap ${
                                        isCompleted || isCurrent ? 'font-bold text-gray-800' : 'text-gray-400'
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {step < 4 && (
                                <div
                                    className={`flex-1 h-[2px] mx-1 -mt-5 ${
                                        step < currentStep ? 'bg-yellow-400' : 'bg-gray-200'
                                    }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

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
    showProposalButton = false,
    showCreatedAt = true,
    onProposalClick,
}: {
    estimate: Estimate;
    onEdit?: (field: string) => void;
    editable?: boolean;
    title?: string;
    proposalNumber?: number;
    sentAt?: string;
    showProposalButton?: boolean;
    showCreatedAt?: boolean;
    onProposalClick?: () => void;
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
            {showCreatedAt && estimate.created_at && (
                <div className="bg-white rounded-lg p-3 mb-4 border border-orange-100">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">作成日時</span>
                        <span className="font-medium">{formatDateTime(estimate.created_at)}</span>
                    </div>
                </div>
            )}

            {/* お客様情報 - 常に表示 */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-600" />
                            <span className="font-medium text-gray-800">お客様情報</span>
                        </div>
                        {editable && onEdit && (
                            <button onClick={() => onEdit('customer')} className="text-gray-400 hover:text-orange-600">
                                <Edit className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">氏名</span>
                            <span className={`font-medium ${fullName ? '' : 'text-red-400'}`}>{fullName || '未収集'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">フリガナ</span>
                            <span className={`font-medium ${fullNameKana ? '' : 'text-gray-400'}`}>{fullNameKana || '未入力'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">電話番号</span>
                            <span className={`font-medium ${estimate.phone ? '' : 'text-red-400'}`}>{estimate.phone || '未収集'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">メールアドレス</span>
                            <span className={`font-medium ${estimate.email ? '' : 'text-gray-400'}`}>{estimate.email || '未入力'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">LINE連携</span>
                            <span className={`font-medium ${estimate.line_user_id ? 'text-green-600' : 'text-gray-400'}`}>{estimate.line_user_id ? '連携済み' : '未連携'}</span>
                        </div>
                    </div>
                </div>
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

                {/* 料金内訳 */}
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
                    {(estimate.truck_count || 1) > 1 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">トラック追加（{(estimate.truck_count || 1) - 1}台）</span>
                            <span className="font-medium">{formatFee(((estimate.base_fee || 0) + (estimate.plan_fee || 0) + (estimate.packing_fee || 0) + (estimate.time_slot_fee || 0) + (estimate.weekend_holiday_fee || 0) + (estimate.floor_pickup_fee || 0) + (estimate.floor_delivery_fee || 0) + (estimate.storage_fee || 0) + (estimate.busy_season_fee || 0) + (estimate.expressway_fee || 0) + (estimate.distance_fee || 0)) * ((estimate.truck_count || 1) - 1))}</span>
                        </div>
                    )}                </div>
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
                    <div className="text-sm break-words">
                        <span className="text-gray-500 mr-1">番地以降:</span>
                        {estimate.pickup_address_detail ? (
                            <span className="text-gray-700">{estimate.pickup_address_detail}</span>
                        ) : (
                            <span className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded text-xs">未収集</span>
                        )}
                    </div>
                    <div className="text-sm break-words">
                        <span className="text-gray-500 mr-1">建物名:</span>
                        {estimate.pickup_building ? (
                            <span className="text-gray-700">{estimate.pickup_building}</span>
                        ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                        )}
                    </div>
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
                    <div className="text-sm break-words">
                        <span className="text-gray-500 mr-1">番地以降:</span>
                        {estimate.delivery_address_detail ? (
                            <span className="text-gray-700">{estimate.delivery_address_detail}</span>
                        ) : (
                            <span className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded text-xs">未収集</span>
                        )}
                    </div>
                    <div className="text-sm break-words">
                        <span className="text-gray-500 mr-1">建物名:</span>
                        {estimate.delivery_building ? (
                            <span className="text-gray-700">{estimate.delivery_building}</span>
                        ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                        )}
                    </div>
                    <div className="text-sm text-gray-600">
                        {floorDelivery}階 / エレベーター：{hasElevatorDelivery ? 'あり' : 'なし'}
                    </div>
                </div>
            </div>

            {/* 備考 */}
            {estimate.notes && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-800">備考</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm break-words">{estimate.notes}</p>
                </div>
            )}

            {/* 再提案ボタン（顧客カルテ内） */}
            {showProposalButton && (
                <div className="flex justify-center">
                    <div className="w-1/2">
                        <Button
                            onClick={onProposalClick}
                            disabled={!estimate.line_user_id}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-base font-bold"
                            size="default"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            顧客に再提案する
                        </Button>
                        {!estimate.line_user_id && (
                            <p className="text-xs text-gray-500 text-center mt-1">
                                LINE連携されていないため再提案できません
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 提案カードコンポーネント（履歴表示用）
const ProposalCard = ({ proposal, prevProposal }: { proposal: any; prevProposal?: any }) => {
    const changed = (key: string) => {
        if (!prevProposal) return false;
        const a = prevProposal[key];
        const b = proposal[key];
        if (a == null && b == null) return false;
        if (a == null || b == null) return true;
        return String(a) !== String(b);
    };
    const hlClass = (key: string) => changed(key) ? 'bg-orange-100 rounded px-1' : '';

    // 変更サマリー
    const changes: string[] = [];
    if (prevProposal) {
        if (changed('total_fee')) changes.push(`金額: ${formatFee(prevProposal.total_fee)} → ${formatFee(proposal.total_fee)}`);
        if (changed('plan')) changes.push(`プラン: ${planLabels[prevProposal.plan] || 'ヘルパープラン'} → ${planLabels[proposal.plan] || 'ヘルパープラン'}`);
        if (changed('pickup_date')) changes.push(`集荷日: ${formatDate(prevProposal.pickup_date)} → ${formatDate(proposal.pickup_date)}`);
        if (changed('delivery_date')) changes.push(`お届け日: ${formatDate(prevProposal.delivery_date)} → ${formatDate(proposal.delivery_date)}`);
        if (changed('pickup_time_slot')) changes.push(`集荷時間帯を変更`);
        if (changed('delivery_time_slot')) changes.push(`お届け時間帯を変更`);
        if (changed('needs_packing')) changes.push(`梱包サービス: ${proposal.needs_packing ? '利用する' : '利用しない'}`);
        if (changed('floor_pickup')) changes.push(`集荷先階数: ${prevProposal.floor_pickup} → ${proposal.floor_pickup}`);
        if (changed('floor_delivery')) changes.push(`届け先階数: ${prevProposal.floor_delivery} → ${proposal.floor_delivery}`);
        if (changed('has_elevator_pickup')) changes.push(`集荷先エレベーター: ${proposal.has_elevator_pickup ? 'あり' : 'なし'}`);
        if (changed('has_elevator_delivery')) changes.push(`届け先エレベーター: ${proposal.has_elevator_delivery ? 'あり' : 'なし'}`);
        const feeKeys = ['base_fee','plan_fee','packing_fee','time_slot_fee','weekend_holiday_fee','floor_pickup_fee','floor_delivery_fee','storage_fee','busy_season_fee','expressway_fee','distance_fee'];
        feeKeys.forEach(k => {
            if (changed(k)) {
                const label: Record<string,string> = {base_fee:'基本料金',plan_fee:'お任せプラン',packing_fee:'梱包サービス',time_slot_fee:'時間指定',weekend_holiday_fee:'土日祝加算',floor_pickup_fee:'集荷先階数料金',floor_delivery_fee:'届け先階数料金',storage_fee:'積み置き料金',busy_season_fee:'繁忙期加算',expressway_fee:'高速道路料金',distance_fee:'距離超過料金'};
                changes.push(`${label[k] || k}: ${formatFee(prevProposal[k] || 0)} → ${formatFee(proposal[k] || 0)}`);
            }
        });
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="font-bold text-lg">提案 #{proposal.proposal_number}</span>
                </div>
                <span className="text-sm text-gray-500">{formatDateTime(proposal.created_at)}</span>
            </div>

            {/* 変更サマリー */}
            {changes.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-orange-700 mb-1">変更点</div>
                    {changes.map((c, i) => (
                        <div key={i} className="text-sm text-orange-800">• {c}</div>
                    ))}
                </div>
            )}
            {!prevProposal && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="text-sm text-blue-700">初回見積もり</div>
                </div>
            )}

            {/* お見積もり金額 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-800">お見積もり金額</span>
                </div>
                <div className={`text-2xl font-bold text-gray-800 ${hlClass('total_fee')}`}>{formatFee(proposal.total_fee)}</div>
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                    <div className="text-sm font-medium text-gray-700 mb-2">料金内訳</div>
                    {[
                        ['base_fee', '基本料金'], ['plan_fee', 'お任せプラン'], ['packing_fee', '梱包サービス'],
                        ['time_slot_fee', '時間指定'], ['weekend_holiday_fee', '土日祝加算'],
                        ['floor_pickup_fee', '集荷先階数料金'], ['floor_delivery_fee', '届け先階数料金'],
                        ['storage_fee', '積み置き料金'], ['busy_season_fee', '繁忙期加算'],
                        ['expressway_fee', '高速道路料金'], ['distance_fee', '距離超過料金'],
                    ].map(([key, label]) => (
                        <div key={key} className={`flex justify-between text-sm ${hlClass(key)}`}>
                            <span className="text-gray-600">{label}</span>
                            <span className="font-medium">{formatFee(proposal[key] || 0)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 日程 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-800">日程</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">集荷日</div>
                        <div className={`font-medium ${hlClass('pickup_date')}`}>{formatDate(proposal.pickup_date)}</div>
                        <div className={`text-sm text-gray-600 ${hlClass('pickup_time_slot')}`}>{timeSlotLabels[proposal.pickup_time_slot || ''] || 'どちらでも'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">お届け日</div>
                        <div className={`font-medium ${hlClass('delivery_date')}`}>{formatDate(proposal.delivery_date)}</div>
                        <div className={`text-sm text-gray-600 ${hlClass('delivery_time_slot')}`}>{timeSlotLabels[proposal.delivery_time_slot || ''] || 'どちらでも'}</div>
                    </div>
                </div>
            </div>

            {/* プラン・オプション */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-800">プラン・オプション</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">プラン</span>
                        <span className={`font-medium ${hlClass('plan')}`}>{planLabels[proposal.plan] || 'ヘルパープラン'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">梱包サービス</span>
                        <span className={`font-medium ${hlClass('needs_packing')}`}>{proposal.needs_packing ? '利用する' : '利用しない'}</span>
                    </div>
                </div>
            </div>

            {/* 集荷先 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-800">集荷先</span>
                </div>
                <div className="space-y-1">
                    <div className={`text-sm text-gray-600 ${hlClass('floor_pickup')}`}>{proposal.floor_pickup || 1}階 / エレベーター：{proposal.has_elevator_pickup ? 'あり' : 'なし'}</div>
                </div>
            </div>

            {/* お届け先 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-800">お届け先</span>
                </div>
                <div className="space-y-1">
                    <div className={`text-sm text-gray-600 ${hlClass('floor_delivery')}`}>{proposal.floor_delivery || 1}階 / エレベーター：{proposal.has_elevator_delivery ? 'あり' : 'なし'}</div>
                </div>
            </div>

            {/* メッセージ */}
            {proposal.message && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">メッセージ</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{proposal.message}</p>
                </div>
            )}
        </div>
    );
};
export default function EstimateDetail() {
    const [, params] = useRoute('/admin/estimates/:id');
    const estimateId = params?.id;

    // Hooks
    const { getEstimate, updateStatus, deleteEstimate, updateFee, updateAdjustment, saveSnapshot, loading } = useEstimates();
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
    const [sendConfirm, setSendConfirm] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'line' | 'email'>('line');
    const [activeProposalTab, setActiveProposalTab] = useState<number>(0);
    const [paymentEmail, setPaymentEmail] = useState('');
    const [cancelModal, setCancelModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [editDateModal, setEditDateModal] = useState(false);
    const [editPlanModal, setEditPlanModal] = useState(false);
    const [editPickupModal, setEditPickupModal] = useState(false);
    const [editDeliveryModal, setEditDeliveryModal] = useState(false);
    const [proposalMessageModal, setProposalMessageModal] = useState(false);
    const [editCustomerModal, setEditCustomerModal] = useState(false);

    // Customer Edit State
    const [adjLastName, setAdjLastName] = useState('');
    const [adjFirstName, setAdjFirstName] = useState('');
    const [adjLastNameKana, setAdjLastNameKana] = useState('');
    const [adjFirstNameKana, setAdjFirstNameKana] = useState('');
    const [adjPhone, setAdjPhone] = useState('');
    const [adjEmail, setAdjEmail] = useState('');

    // Time Slot Adjustment State
    const [adjPickupTimeSlot, setAdjPickupTimeSlot] = useState('');
    const [adjDeliveryTimeSlot, setAdjDeliveryTimeSlot] = useState('');

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
    const [adjTruckCount, setAdjTruckCount] = useState(1);
    const [memoContent, setMemoContent] = useState('');
    const [proposalMessage, setProposalMessage] = useState('');

    // Adjustment State
    const [adjPickupDate, setAdjPickupDate] = useState('');
    const [adjDeliveryDate, setAdjDeliveryDate] = useState('');
    const [adjPlan, setAdjPlan] = useState('');
    const [adjNeedsPacking, setAdjNeedsPacking] = useState(false);
    const [adjFloorPickup, setAdjFloorPickup] = useState(1);
    const [adjHasElevatorPickup, setAdjHasElevatorPickup] = useState(false);
    const [adjPickupAddressDetail, setAdjPickupAddressDetail] = useState('');
    const [adjPickupBuilding, setAdjPickupBuilding] = useState('');
    const [adjFloorDelivery, setAdjFloorDelivery] = useState(1);
    const [adjHasElevatorDelivery, setAdjHasElevatorDelivery] = useState(false);
    const [adjDeliveryAddressDetail, setAdjDeliveryAddressDetail] = useState('');
    const [adjDeliveryBuilding, setAdjDeliveryBuilding] = useState('');

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
                setAdjTruckCount(estimate.truck_count || 1);
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
                setAdjPickupTimeSlot(estimate.pickup_time_slot || '');
                setAdjDeliveryTimeSlot(estimate.delivery_time_slot || '');
                setEditDateModal(true);
                break;
            case 'customer':
                setAdjLastName(estimate.last_name || '');
                setAdjFirstName(estimate.first_name || '');
                setAdjLastNameKana(estimate.last_name_kana || '');
                setAdjFirstNameKana(estimate.first_name_kana || '');
                setAdjPhone(estimate.phone || '');
                setAdjEmail(estimate.email || '');
                setEditCustomerModal(true);
                break;
            case 'plan':
                setAdjPlan(estimate.adjusted_plan || estimate.plan || 'helper');
                setAdjNeedsPacking(estimate.adjusted_needs_packing ?? estimate.needs_packing ?? false);
                setEditPlanModal(true);
                break;
            case 'pickup':
                setAdjFloorPickup(estimate.adjusted_floor_pickup ?? estimate.floor_pickup ?? 1);
                setAdjHasElevatorPickup(estimate.adjusted_has_elevator_pickup ?? estimate.has_elevator_pickup ?? false);
                setAdjPickupAddressDetail(estimate.pickup_address_detail || '');
                setAdjPickupBuilding(estimate.pickup_building || '');
                setEditPickupModal(true);
                break;
            case 'delivery':
                setAdjFloorDelivery(estimate.adjusted_floor_delivery ?? estimate.floor_delivery ?? 1);
                setAdjHasElevatorDelivery(estimate.adjusted_has_elevator_delivery ?? estimate.has_elevator_delivery ?? false);
                setAdjDeliveryAddressDetail(estimate.delivery_address_detail || '');
                setAdjDeliveryBuilding(estimate.delivery_building || '');
                setEditDeliveryModal(true);
                break;
        }
    };

    // 金額変更（内訳から合計を計算して保存）
    const handleFeeSubmit = async () => {
        if (!estimateId) return;
        // この行を削除: await saveSnapshot(estimateId);
        await updateFee(estimateId, calculatedTotal * adjTruckCount, feeReason, feeBreakdown.expresswayFee, { ...feeBreakdown, truckCount: adjTruckCount });
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
        setSendLoading(true);

        let success = false;
        if (type === 'invite') {
            success = await sendInvite(estimateId);
        } else if (paymentMethod === 'line') {
            success = await sendPayment(estimateId);
        } else {
            // メールで決済案内送信
            try {
                if (!paymentEmail) {
                    alert('メールアドレスを入力してください');
                    return;
                }
                const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/estimates/${estimateId}/send-payment-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: paymentEmail }),
                });
                const data = await response.json();
                success = data.success;
                if (!success) alert(data.error || '送信に失敗しました');
            } catch (err) {
                console.error('Payment email error:', err);
                alert('送信に失敗しました');
            }
        }

        setSendLoading(false);
        if (success) {
            setSendModal(null);
            setSendConfirm(false);
            setPaymentEmail('');
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

    // 削除
    const handleDelete = async () => {
        if (!estimateId) return;
        const success = await deleteEstimate(estimateId);
        if (success) {
            setDeleteModal(false);
            // 一覧ページにリダイレクト
            window.location.href = '/admin/estimates';
        }
    };

    // 日程調整
    const handleDateAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjustedPickupDate: adjPickupDate || undefined,
            adjustedDeliveryDate: adjDeliveryDate || undefined,
        };
        await updateAdjustment(estimateId, data);
        // 時間帯も更新
        await fetch(`${window.location.origin}/api/admin/estimates/${estimateId}/customer`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                pickup_time_slot: adjPickupTimeSlot,
                delivery_time_slot: adjDeliveryTimeSlot,
            }),
        });
        setEditDateModal(false);
        fetchData();
    };

    // お客様情報更新
    const handleCustomerUpdate = async () => {
        if (!estimateId) return;
        try {
            const res = await fetch(`${window.location.origin}/api/admin/estimates/${estimateId}/customer`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    last_name: adjLastName,
                    first_name: adjFirstName,
                    last_name_kana: adjLastNameKana,
                    first_name_kana: adjFirstNameKana,
                    phone: adjPhone,
                    email: adjEmail,
                }),
            });
            if (res.ok) {
                setEditCustomerModal(false);
                fetchData();
            }
        } catch (err) {
            console.error('Customer update error:', err);
        }
    };

    // プラン調整
    const handlePlanAdjustment = async () => {
        if (!estimateId) return;
        // この行を削除: await saveSnapshot(estimateId);
        const data: AdjustmentData = {
            adjustedPlan: adjPlan || undefined,
            adjustedNeedsPacking: adjNeedsPacking,
        };
        await updateAdjustment(estimateId, data);
        setEditPlanModal(false);
        fetchData();
    };


    // 集荷条件調整
    const handlePickupAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjustedFloorPickup: adjFloorPickup,
            adjustedHasElevatorPickup: adjHasElevatorPickup,
        };
        await updateAdjustment(estimateId, data);
        // 住所詳細を保存
        try {
            await updateCustomer(estimateId, { pickup_address_detail: adjPickupAddressDetail, pickup_building: adjPickupBuilding });
        } catch (e) { console.error('住所保存エラー:', e); }
        setEditPickupModal(false);
        fetchData();
    };


    // お届け条件調整
    const handleDeliveryAdjustment = async () => {
        if (!estimateId) return;
        const data: AdjustmentData = {
            adjustedFloorDelivery: adjFloorDelivery,
            adjustedHasElevatorDelivery: adjHasElevatorDelivery,
        };
        await updateAdjustment(estimateId, data);
        // 住所詳細を保存
        try {
            await updateCustomer(estimateId, { delivery_address_detail: adjDeliveryAddressDetail, delivery_building: adjDeliveryBuilding });
        } catch (e) { console.error('住所保存エラー:', e); }
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
            baseFee: estimate.base_fee || 0,
            planFee: estimate.plan_fee || 0,
            packingFee: estimate.packing_fee || 0,
            timeSlotFee: estimate.time_slot_fee || 0,
            weekendHolidayFee: estimate.weekend_holiday_fee || 0,
            floorPickupFee: estimate.floor_pickup_fee || 0,
            floorDeliveryFee: estimate.floor_delivery_fee || 0,
            storageFee: estimate.storage_fee || 0,
            busySeasonFee: estimate.busy_season_fee || 0,
            distanceFee: estimate.distance_fee || 0,
            // 住所情報
            pickupPrefecture: estimate.pickup_prefecture || '',
            pickupCity: estimate.pickup_city || '',
            pickupTown: estimate.pickup_town || '',
            pickupAddressDetail: estimate.pickup_address_detail || '',
            pickupBuilding: estimate.pickup_building || '',
            deliveryPrefecture: estimate.delivery_prefecture || '',
            deliveryCity: estimate.delivery_city || '',
            deliveryTown: estimate.delivery_town || '',
            deliveryAddressDetail: estimate.delivery_address_detail || '',
            deliveryBuilding: estimate.delivery_building || '',
            // 顧客情報
            lastName: estimate.last_name || '',
            firstName: estimate.first_name || '',
            lastNameKana: estimate.last_name_kana || '',
            firstNameKana: estimate.first_name_kana || '',
            phone: estimate.phone || '',
            notes: estimate.notes || '',
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
                    <div className="mb-2">
                        <Link href="/admin/estimates">
                            <a className="flex items-center text-gray-600 hover:text-gray-800">
                                <ArrowLeft className="w-5 h-5 mr-1" />
                                一覧に戻る
                            </a>
                        </Link>
                    </div>
                    <div className="mb-6">
                        <StatusProgressBar status={estimate.status} />
                    </div>

                    {/* 基本情報 */}
                    <Section title="基本情報">
                        <InfoRow label="見積ID" value={estimate.id} />
                        <InfoRow label="LINE連携" value={estimate.line_user_id ? '連携済み' : '未連携'} />
                        <InfoRow label="メールアドレス" value={estimate.email || '未登録'} />
                        <InfoRow label="連携元" value={estimate.email ? 'メール' : (estimate.line_user_id ? 'LINE' : '不明')} />                    </Section>

                    {/* アクションボタン */}
                    <Section title="アクション">
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => setSendModal('invite')}
                                disabled={!estimate.line_user_id}
                                className="w-full py-3 text-sm"
                                size="default"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                申込案内
                            </Button>
                            <Button
                                onClick={() => { setPaymentEmail(estimate.email || ''); setSendModal('payment'); }}
                                className="w-full py-3 text-sm"
                                size="default"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                決済案内
                            </Button>
                            <Button
                                onClick={() => setCancelModal(true)}
                                variant="destructive"
                                className="w-full py-3 text-sm"
                                size="default"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                キャンセル
                            </Button>
                            <Button
                                onClick={() => setDeleteModal(true)}
                                variant="outline"
                                className="w-full py-3 text-sm text-red-600 border-red-300 hover:bg-red-50"
                                size="default"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                            </Button>
                        </div>
                    </Section>

                    {/* 顧客カルテ（編集可能・再提案ボタン内蔵） */}
                    <CustomerCard
                        estimate={estimate}
                        onEdit={handleCardEdit}
                        editable={true}
                        title="顧客カルテ"
                        showProposalButton={true}
                        onProposalClick={() => setProposalMessageModal(true)}
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

                    {/* 変更履歴 */}
                    {proposals.length > 1 && (
                        <Section title="変更履歴" icon={<FileText className="w-5 h-5 text-gray-600" />}>
                            {/* タブ */}
                            <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
                                {[...proposals].reverse().map((proposal, idx) => (
                                    <button
                                        key={proposal.id}
                                        onClick={() => setActiveProposalTab(idx)}
                                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                            activeProposalTab === idx
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        #{proposal.proposal_number} {formatDateTime(proposal.created_at)}
                                    </button>
                                ))}
                            </div>

                            {/* 選択中のタブの内容 */}
                            {(() => {
                                const reversedProposals = [...proposals].reverse();
                                const proposal = reversedProposals[activeProposalTab];
                                if (!proposal) return null;

                                const prevProp = activeProposalTab > 0 ? reversedProposals[activeProposalTab - 1] : undefined;
                                return (
                                    <ProposalCard proposal={proposal} prevProposal={prevProp} />
                                );
                            })()}
                        </Section>
                    )}

                    {/* ===== モーダル群 ===== */}

                    {/* 金額編集モーダル */}
                    <Dialog open={editFeeModal} onOpenChange={setEditFeeModal}>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>金額を変更</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {(Object.keys(feeLabels) as Array<keyof FeeBreakdown>).map((key) => (
                                    <div key={key} className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {feeLabels[key]}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={feeBreakdown[key] ?? ''}
                                                onChange={(e) => updateFeeItem(key, e.target.value)}
                                                placeholder="0"
                                                className="w-24 sm:w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-right placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="text-gray-500 shrink-0">円</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">トラック台数</label>
                                        <select
                                            value={adjTruckCount}
                                            onChange={(e) => setAdjTruckCount(Number(e.target.value))}
                                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                                        >
                                            {[1,2,3,4,5].map(n => (
                                                <option key={n} value={n}>{n}台</option>
                                            ))}
                                        </select>
                                    </div>
                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                        <span>1台分</span>
                                        <span>{formatFee(calculatedTotal)}</span>
                                    </div>
                                    {adjTruckCount > 1 && (
                                        <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                            <span>トラック追加（{adjTruckCount - 1}台）</span>
                                            <span>{formatFee(calculatedTotal * (adjTruckCount - 1))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>合計金額</span>
                                        <span className="text-orange-600">{formatFee(calculatedTotal * adjTruckCount)}</span>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">変更理由</label>
                                    <Textarea
                                        value={feeReason}
                                        onChange={(e) => setFeeReason(e.target.value)}
                                        placeholder="例: 繁忙期割引適用"
                                        rows={2}
                                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                                    <Input type="date" value={adjPickupDate} onChange={(e) => setAdjPickupDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">集荷希望時間帯</label>
                                    <select className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjPickupTimeSlot} onChange={(e) => setAdjPickupTimeSlot(e.target.value)}>
                                        <option value="">未選択</option>
                                        <option value="morning">午前</option>
                                        <option value="afternoon">午後</option>
                                        <option value="anytime">どちらでも</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">お届け日</label>
                                    <Input type="date" value={adjDeliveryDate} onChange={(e) => setAdjDeliveryDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">お届け希望時間帯</label>
                                    <select className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjDeliveryTimeSlot} onChange={(e) => setAdjDeliveryTimeSlot(e.target.value)}>
                                        <option value="">未選択</option>
                                        <option value="morning">午前</option>
                                        <option value="afternoon">午後</option>
                                        <option value="anytime">どちらでも</option>
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditDateModal(false)}>キャンセル</Button>
                                <Button onClick={handleDateAdjustment}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* お客様情報編集モーダル */}
                    <Dialog open={editCustomerModal} onOpenChange={setEditCustomerModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>お客様情報を編集</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">姓</label>
                                        <Input value={adjLastName} onChange={(e) => setAdjLastName(e.target.value)} placeholder="山田" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">名</label>
                                        <Input value={adjFirstName} onChange={(e) => setAdjFirstName(e.target.value)} placeholder="太郎" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">姓（カナ）</label>
                                        <Input value={adjLastNameKana} onChange={(e) => setAdjLastNameKana(e.target.value)} placeholder="ヤマダ" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">名（カナ）</label>
                                        <Input value={adjFirstNameKana} onChange={(e) => setAdjFirstNameKana(e.target.value)} placeholder="タロウ" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">電話番号</label>
                                    <Input value={adjPhone} onChange={(e) => setAdjPhone(e.target.value)} placeholder="090-1234-5678" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">メールアドレス</label>
                                    <Input value={adjEmail} onChange={(e) => setAdjEmail(e.target.value)} placeholder="example@email.com" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditCustomerModal(false)}>キャンセル</Button>
                                <Button onClick={handleCustomerUpdate}>保存</Button>
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">番地以降</label>
                                    <input type="text" className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjPickupAddressDetail} onChange={(e) => setAdjPickupAddressDetail(e.target.value)} placeholder="例: 1-2-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">建物名・部屋番号</label>
                                    <input type="text" className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjPickupBuilding} onChange={(e) => setAdjPickupBuilding(e.target.value)} placeholder="例: ○○マンション101" />
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">番地以降</label>
                                    <input type="text" className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjDeliveryAddressDetail} onChange={(e) => setAdjDeliveryAddressDetail(e.target.value)} placeholder="例: 4-5-6" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">建物名・部屋番号</label>
                                    <input type="text" className="w-full h-10 px-3 border border-gray-300 rounded-md" value={adjDeliveryBuilding} onChange={(e) => setAdjDeliveryBuilding(e.target.value)} placeholder="例: △△ビル202" />
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
                                <DialogDescription>このメモを削除します。よろしいですか？</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteMemoModal(false)}>キャンセル</Button>
                                <Button variant="destructive" onClick={handleMemoDelete}>削除</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 送信確認モーダル */}
                    <Dialog open={sendModal !== null} onOpenChange={() => { if (!sendLoading) { setSendModal(null); setSendConfirm(false); } }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{sendModal === 'invite' ? '申込案内を送信' : '決済案内を送信'}</DialogTitle>
                            </DialogHeader>
                            {sendModal === 'payment' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">送信方法</label>
                                        <div className="flex gap-2">
                                            <button
                                                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${paymentMethod === 'line' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                                                onClick={() => setPaymentMethod('line')}
                                            >
                                                LINE
                                            </button>
                                            <button
                                                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${paymentMethod === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                                                onClick={() => setPaymentMethod('email')}
                                            >
                                                メール
                                            </button>
                                        </div>
                                    </div>
                                    {paymentMethod === 'email' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">メールアドレス</label>
                                            <input
                                                type="email"
                                                className="w-full h-10 px-3 border border-gray-300 rounded-md"
                                                value={paymentEmail}
                                                onChange={(e) => setPaymentEmail(e.target.value)}
                                                placeholder="example@email.com"
                                            />
                                        </div>
                                    )}
                                    {paymentMethod === 'line' && (
                                        <p className="text-sm text-gray-600">LINEで決済案内を送信します。よろしいですか？</p>
                                    )}
                                </div>
                            ) : (
                                <DialogDescription>
                                    LINEで申込案内を送信します。よろしいですか？
                                </DialogDescription>
                            )}
                            <DialogFooter>
                                {!sendConfirm ? (
                                    <>
                                        <Button variant="outline" onClick={() => setSendModal(null)}>キャンセル</Button>
                                        <Button onClick={() => setSendConfirm(true)}>送信</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={() => setSendConfirm(false)}>戻る</Button>
                                        <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={sendLoading} onClick={() => { sendModal && handleSend(sendModal); }}>{sendLoading ? '送信中...' : '本当に送信する'}</Button>
                                    </>
                                )}
                            </DialogFooter>
                            {sendConfirm && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 -mt-2">
                                    <p className="text-sm text-yellow-800 font-medium text-center">⚠️ 本当に送信しますか？この操作は取り消せません。</p>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* キャンセル確認モーダル */}
                    <Dialog open={cancelModal} onOpenChange={setCancelModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>キャンセル確認</DialogTitle>
                                <DialogDescription>この見積もりをキャンセルします。よろしいですか？</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCancelModal(false)}>戻る</Button>
                                <Button variant="destructive" onClick={handleCancel}>キャンセルする</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 削除確認モーダル */}
                    <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>見積もりを削除</DialogTitle>
                                <DialogDescription>
                                    この見積もりを完全に削除します。関連するすべてのデータ（変更履歴、メモ、送信履歴など）も削除されます。この操作は取り消せません。
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteModal(false)}>キャンセル</Button>
                                <Button variant="destructive" onClick={handleDelete}>削除する</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 再提案メッセージモーダル */}
                    <Dialog open={proposalMessageModal} onOpenChange={setProposalMessageModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>再提案を送信</DialogTitle>
                                <DialogDescription>
                                    現在の顧客カルテの内容でLINEに再提案を送信します。メッセージを添えることもできます。
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
        </RequireAuth >
    );
}
