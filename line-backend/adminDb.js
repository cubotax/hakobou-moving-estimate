/**
 * 管理画面用データベース操作モジュール
 */

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Supabaseクライアント（遅延初期化）
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY not configured for admin');
            return null;
        }
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

function requireSupabase() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }
    return client;
}

// =====================================================
// 見積もり管理
// =====================================================

/**
 * 見積もり一覧を取得（フィルター・ページネーション対応）
 */
export async function getEstimatesList({
    status = null,
    period = null,
    search = null,
    page = 1,
    limit = 20,
} = {}) {
    const supabase = requireSupabase();
    let query = supabase
        .from('estimates')
        .select('*', { count: 'exact' });

    // ステータスフィルター
    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    // 期間フィルター
    if (period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = null;
        }

        if (startDate) {
            query = query.gte('created_at', startDate.toISOString());
        }
    }

    // 検索フィルター（電話番号・ID）
    if (search) {
        query = query.or(`id.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // ページネーション
    const offset = (page - 1) * limit;
    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error getting estimates list:', error);
        throw error;
    }

    return {
        estimates: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
    };
}

/**
 * 見積もり詳細を取得
 */
export async function getEstimateDetail(estimateId) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting estimate detail:', error);
        throw error;
    }

    return data || null;
}

/**
 * 見積もりステータスを更新
 */
export async function updateEstimateStatus(estimateId, status) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('estimates')
        .update({ status })
        .eq('id', estimateId)
        .select()
        .single();

    if (error) {
        console.error('Error updating estimate status:', error);
        throw error;
    }

    return data;
}

/**
 * 見積もり金額を更新
 */
export async function updateEstimateFee(estimateId, { finalFee, feeChangeReason }) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('estimates')
        .update({
            final_fee: finalFee,
            fee_change_reason: feeChangeReason,
        })
        .eq('id', estimateId)
        .select()
        .single();

    if (error) {
        console.error('Error updating estimate fee:', error);
        throw error;
    }

    return data;
}

// =====================================================
// メモ管理
// =====================================================

/**
 * メモ一覧を取得
 */
export async function getEstimateMemos(estimateId) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('admin_memos')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error getting estimate memos:', error);
        throw error;
    }

    return data || [];
}

/**
 * メモを追加
 */
export async function addEstimateMemo(estimateId, content, createdBy) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('admin_memos')
        .insert({
            id: nanoid(12),
            estimate_id: estimateId,
            content,
            created_by: createdBy,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding estimate memo:', error);
        throw error;
    }

    return data;
}

// =====================================================
// 送信履歴管理
// =====================================================

/**
 * 送信履歴を取得
 */
export async function getMessageLogs(estimateId) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('message_logs')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sent_at', { ascending: false });

    if (error) {
        console.error('Error getting message logs:', error);
        throw error;
    }

    return data || [];
}

/**
 * 送信履歴を追加
 */
export async function addMessageLog(estimateId, messageType, sentBy = null) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('message_logs')
        .insert({
            id: nanoid(12),
            estimate_id: estimateId,
            message_type: messageType,
            sent_by: sentBy,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding message log:', error);
        throw error;
    }

    return data;
}

// =====================================================
// クーポン管理
// =====================================================

/**
 * クーポン一覧を取得
 */
export async function getCouponsList() {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error getting coupons list:', error);
        throw error;
    }

    // 各クーポンの利用回数を取得
    const couponsWithUsage = await Promise.all(
        (data || []).map(async (coupon) => {
            const { count } = await supabase
                .from('coupon_usages')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id);

            return {
                ...coupon,
                usage_count: count || 0,
            };
        })
    );

    return couponsWithUsage;
}

/**
 * クーポン詳細を取得
 */
export async function getCouponDetail(couponId) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting coupon detail:', error);
        throw error;
    }

    if (data) {
        // 利用回数を取得
        const { count } = await supabase
            .from('coupon_usages')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', couponId);

        data.usage_count = count || 0;
    }

    return data || null;
}

/**
 * クーポンをコードで取得
 */
export async function getCouponByCode(code) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting coupon by code:', error);
        throw error;
    }

    if (data) {
        // 利用回数を取得
        const { count } = await supabase
            .from('coupon_usages')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', data.id);

        data.usage_count = count || 0;
    }

    return data || null;
}

/**
 * クーポンを作成
 */
export async function createCoupon(couponData) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupons')
        .insert({
            id: nanoid(12),
            code: couponData.code.toUpperCase(),
            discount_type: couponData.discountType,
            discount_value: couponData.discountValue,
            min_amount: couponData.minAmount || 0,
            start_date: couponData.startDate || null,
            end_date: couponData.endDate || null,
            usage_limit: couponData.usageLimit || null,
            once_per_user: couponData.oncePerUser ?? true,
            is_active: couponData.isActive ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating coupon:', error);
        throw error;
    }

    return data;
}

/**
 * クーポンを更新
 */
export async function updateCoupon(couponId, couponData) {
    const supabase = requireSupabase();
    const updateData = {};

    if (couponData.code !== undefined) updateData.code = couponData.code.toUpperCase();
    if (couponData.discountType !== undefined) updateData.discount_type = couponData.discountType;
    if (couponData.discountValue !== undefined) updateData.discount_value = couponData.discountValue;
    if (couponData.minAmount !== undefined) updateData.min_amount = couponData.minAmount;
    if (couponData.startDate !== undefined) updateData.start_date = couponData.startDate;
    if (couponData.endDate !== undefined) updateData.end_date = couponData.endDate;
    if (couponData.usageLimit !== undefined) updateData.usage_limit = couponData.usageLimit;
    if (couponData.oncePerUser !== undefined) updateData.once_per_user = couponData.oncePerUser;
    if (couponData.isActive !== undefined) updateData.is_active = couponData.isActive;

    const { data, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', couponId)
        .select()
        .single();

    if (error) {
        console.error('Error updating coupon:', error);
        throw error;
    }

    return data;
}

/**
 * クーポンを削除
 */
export async function deleteCoupon(couponId) {
    const supabase = requireSupabase();
    const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

    if (error) {
        console.error('Error deleting coupon:', error);
        throw error;
    }

    return true;
}

/**
 * クーポン利用履歴を取得
 */
export async function getCouponUsages(couponId) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupon_usages')
        .select(`
            *,
            estimates:estimate_id (
                id,
                pickup_prefecture,
                pickup_city,
                delivery_prefecture,
                delivery_city,
                total_fee
            )
        `)
        .eq('coupon_id', couponId)
        .order('used_at', { ascending: false });

    if (error) {
        console.error('Error getting coupon usages:', error);
        throw error;
    }

    return data || [];
}

/**
 * クーポン利用を記録
 */
export async function recordCouponUsage({
    couponId,
    estimateId,
    lineUserId,
    originalAmount,
    discountAmount,
    finalAmount,
}) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('coupon_usages')
        .insert({
            id: nanoid(12),
            coupon_id: couponId,
            estimate_id: estimateId,
            line_user_id: lineUserId,
            original_amount: originalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
        })
        .select()
        .single();

    if (error) {
        console.error('Error recording coupon usage:', error);
        throw error;
    }

    return data;
}

/**
 * ユーザーがクーポンを使用済みかチェック
 */
export async function hasUserUsedCoupon(couponId, lineUserId) {
    const supabase = requireSupabase();
    const { count, error } = await supabase
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', couponId)
        .eq('line_user_id', lineUserId);

    if (error) {
        console.error('Error checking coupon usage:', error);
        throw error;
    }

    return (count || 0) > 0;
}

/**
 * クーポンを検証
 * ※ 割引は「基本料金」に対してのみ適用（総額ではない）
 */
export async function validateCoupon(code, estimateId, lineUserId) {
    const supabase = requireSupabase();

    // 基本料金（固定値）
    const BASE_FEE = 19800;

    // クーポンを取得
    const coupon = await getCouponByCode(code);

    if (!coupon) {
        return { valid: false, error: 'このクーポンコードは存在しません' };
    }

    // 有効/無効チェック
    if (!coupon.is_active) {
        return { valid: false, error: 'このクーポンは現在ご利用いただけません' };
    }

    // 期間チェック
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (coupon.start_date) {
        const startDate = new Date(coupon.start_date);
        if (today < startDate) {
            return { valid: false, error: 'このクーポンはまだ利用できません' };
        }
    }

    if (coupon.end_date) {
        const endDate = new Date(coupon.end_date);
        if (today > endDate) {
            return { valid: false, error: 'このクーポンは有効期限が切れています' };
        }
    }

    // 利用回数上限チェック
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return { valid: false, error: 'このクーポンは利用上限に達しました' };
    }

    // 1人1回制限チェック
    if (coupon.once_per_user && lineUserId) {
        const hasUsed = await hasUserUsedCoupon(coupon.id, lineUserId);
        if (hasUsed) {
            return { valid: false, error: 'このクーポンは既にご利用済みです' };
        }
    }

    // 見積もり取得して最低金額チェック
    const { data: estimate } = await supabase
        .from('estimates')
        .select('total_fee')
        .eq('id', estimateId)
        .single();

    if (!estimate) {
        return { valid: false, error: '見積もりが見つかりません' };
    }

    const originalAmount = estimate.total_fee;

    if (originalAmount < coupon.min_amount) {
        return {
            valid: false,
            error: `このクーポンは¥${coupon.min_amount.toLocaleString()}以上でご利用いただけます`
        };
    }

    // 割引額を計算（基本料金に対してのみ適用）
    let discountAmount;
    if (coupon.discount_type === 'fixed') {
        // 固定額割引: 基本料金を上限とする
        discountAmount = Math.min(coupon.discount_value, BASE_FEE);
    } else {
        // 割引率: 基本料金に対して計算
        discountAmount = Math.floor(BASE_FEE * coupon.discount_value / 100);
    }

    // オプション・加算料金（基本料金以外の部分）を計算
    const otherFees = Math.max(0, originalAmount - BASE_FEE);

    // 最終金額 = (基本料金 - 割引) + オプション合計
    // ※基本料金部分がマイナスにならないよう保護
    const discountedBaseFee = Math.max(0, BASE_FEE - discountAmount);
    const finalAmount = discountedBaseFee + otherFees;

    return {
        valid: true,
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount,
        originalAmount,
        finalAmount,
    };
}

export { getSupabase };
