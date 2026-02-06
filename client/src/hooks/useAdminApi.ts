/**
 * 管理画面用APIフック
 */

import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// トークン取得
function getToken() {
    return localStorage.getItem('adminToken');
}

// 認証付きfetch
async function authFetch(url: string, options: RequestInit = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // 認証エラーの場合はログインページにリダイレクト
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        throw new Error('認証が必要です');
    }

    return response;
}

// =====================================================
// 見積もり関連
// =====================================================

export interface Estimate {
    id: string;
    status: string;
    pickup_prefecture: string;
    pickup_city: string;
    pickup_town: string;
    pickup_address_detail?: string;
    pickup_building?: string;
    delivery_prefecture: string;
    delivery_city: string;
    delivery_town: string;
    delivery_address_detail?: string;
    delivery_building?: string;
    pickup_date: string;
    delivery_date: string;
    total_fee: number;
    final_fee?: number;
    fee_change_reason?: string;
    coupon_code?: string;
    discount_amount?: number;
    distance_km: number;
    floor_pickup: number;
    has_elevator_pickup: boolean;
    floor_delivery: number;
    has_elevator_delivery: boolean;
    needs_packing: boolean;
    plan?: string;
    phone?: string;
    email?: string;
    pickup_time_slot?: string;
    delivery_time_slot?: string;
    notes?: string;
    line_user_id?: string;
    created_at: string;
    applied_at?: string;
    // 調整後の値
    adjusted_pickup_date?: string;
    adjusted_delivery_date?: string;
    adjusted_plan?: string;
    adjusted_needs_packing?: boolean;
    adjusted_floor_pickup?: number;
    adjusted_has_elevator_pickup?: boolean;
    adjusted_floor_delivery?: number;
    adjusted_has_elevator_delivery?: boolean;
    adjusted_at?: string;
    adjusted_by?: string;
}

export interface AdjustmentData {
    adjustedPickupDate?: string;
    adjustedDeliveryDate?: string;
    adjustedPlan?: string;
    adjustedNeedsPacking?: boolean;
    adjustedFloorPickup?: number;
    adjustedHasElevatorPickup?: boolean;
    adjustedFloorDelivery?: number;
    adjustedHasElevatorDelivery?: boolean;
}

export interface EstimatesListResponse {
    estimates: Estimate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useEstimates() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getEstimates = useCallback(async (params: {
        status?: string;
        period?: string;
        search?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<EstimatesListResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const searchParams = new URLSearchParams();
            if (params.status) searchParams.set('status', params.status);
            if (params.period) searchParams.set('period', params.period);
            if (params.search) searchParams.set('search', params.search);
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());

            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates?${searchParams.toString()}`
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch estimates');
            }

            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getEstimate = useCallback(async (id: string): Promise<Estimate | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch estimate');
            }

            return data.estimate;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update status');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteEstimate = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete estimate');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateFee = useCallback(async (
        id: string,
        finalFee: number,
        feeChangeReason: string,
        expresswayFee?: number,
        feeBreakdown?: {
            baseFee?: number;
            planFee?: number;
            packingFee?: number;
            timeSlotFee?: number;
            weekendHolidayFee?: number;
            floorPickupFee?: number;
            floorDeliveryFee?: number;
            storageFee?: number;
            busySeasonFee?: number;
            expresswayFee?: number;
            distanceFee?: number;
        }
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}/fee`, {
                method: 'PUT',
                body: JSON.stringify({ finalFee, feeChangeReason, expresswayFee, feeBreakdown }),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update fee');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const saveSnapshot = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}/snapshot`, {
                method: 'POST',
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to save snapshot');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateAdjustment = useCallback(async (
        id: string,
        adjustmentData: AdjustmentData
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${id}/adjust`, {
                method: 'PUT',
                body: JSON.stringify(adjustmentData),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update adjustment');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getEstimates,
        getEstimate,
        updateStatus,
        deleteEstimate,
        updateFee,
        updateAdjustment,
        saveSnapshot,
    };
}

// =====================================================
// メモ関連
// =====================================================

export interface Memo {
    id: string;
    estimate_id: string;
    content: string;
    created_by: string;
    created_at: string;
}

export function useMemos() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getMemos = useCallback(async (estimateId: string): Promise<Memo[]> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/memos`
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch memos');
            }

            return data.memos;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addMemo = useCallback(async (estimateId: string, content: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/memos`,
                {
                    method: 'POST',
                    body: JSON.stringify({ content }),
                }
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to add memo');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);
    const updateMemo = useCallback(async (estimateId: string, memoId: string, content: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/memos/${memoId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ content }),
                }
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update memo');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteMemo = useCallback(async (estimateId: string, memoId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/memos/${memoId}`,
                {
                    method: 'DELETE',
                }
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete memo');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, getMemos, addMemo, updateMemo, deleteMemo };
}

// =====================================================
// 送信履歴・メッセージ送信関連
// =====================================================

export interface MessageLog {
    id: string;
    estimate_id: string;
    message_type: 'estimate' | 'invite' | 'payment';
    sent_by: string | null;
    sent_at: string;
}

export function useMessages() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getLogs = useCallback(async (estimateId: string): Promise<MessageLog[]> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/logs`
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch logs');
            }

            return data.logs;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const sendInvite = useCallback(async (estimateId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/send-invite`,
                { method: 'POST' }
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to send invite');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const sendPayment = useCallback(async (estimateId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/admin/estimates/${estimateId}/send-payment`,
                { method: 'POST' }
            );
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to send payment');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, getLogs, sendInvite, sendPayment };
}

// =====================================================
// クーポン関連
// =====================================================

export interface Coupon {
    id: string;
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    min_amount: number;
    start_date: string | null;
    end_date: string | null;
    usage_limit: number | null;
    once_per_user: boolean;
    is_active: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

export interface CouponUsage {
    id: string;
    coupon_id: string;
    estimate_id: string;
    line_user_id: string;
    original_amount: number;
    discount_amount: number;
    final_amount: number;
    used_at: string;
    estimates?: {
        id: string;
        pickup_prefecture: string;
        pickup_city: string;
        delivery_prefecture: string;
        delivery_city: string;
        total_fee: number;
    };
}

export function useCoupons() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCoupons = useCallback(async (): Promise<Coupon[]> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch coupons');
            }

            return data.coupons;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getCoupon = useCallback(async (id: string): Promise<Coupon | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons/${id}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch coupon');
            }

            return data.coupon;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createCoupon = useCallback(async (couponData: Partial<Coupon>): Promise<Coupon | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons`, {
                method: 'POST',
                body: JSON.stringify(couponData),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create coupon');
            }

            return data.coupon;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateCoupon = useCallback(async (
        id: string,
        couponData: Partial<Coupon>
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons/${id}`, {
                method: 'PUT',
                body: JSON.stringify(couponData),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update coupon');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteCoupon = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete coupon');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const getCouponUsages = useCallback(async (id: string): Promise<CouponUsage[]> => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/coupons/${id}/usages`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch coupon usages');
            }

            return data.usages;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getCoupons,
        getCoupon,
        createCoupon,
        updateCoupon,
        deleteCoupon,
        getCouponUsages,
    };
}


// 提案関連のフック
export function useProposals() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getProposals = useCallback(async (estimateId: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${estimateId}/proposals`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch proposals');
            }

            return data.proposals;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createProposal = useCallback(async (estimateId: string, proposalData: {
        pickupDate?: string;
        deliveryDate?: string;
        pickupTimeSlot?: string;
        deliveryTimeSlot?: string;
        floorPickup?: number;
        hasElevatorPickup?: boolean;
        floorDelivery?: number;
        hasElevatorDelivery?: boolean;
        plan?: string;
        needsPacking?: boolean;
        totalFee: number;
        expresswayFee?: number;
        message?: string;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${estimateId}/proposals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposalData),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create proposal');
            }

            return data.proposal;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const sendProposal = useCallback(async (estimateId: string, proposalId: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${estimateId}/proposals/${proposalId}/send`, {
                method: 'POST',
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to send proposal');
            }

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getProposals,
        createProposal,
        sendProposal,
    };
}

/**
 * アクション履歴用フック
 */
export function useActionLogs() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getActionLogs = useCallback(async (estimateId: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/estimates/${estimateId}/action-logs`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch action logs');
            }

            return data.logs || [];
        } catch (err) {
            const message = err instanceof Error ? err.message : 'エラーが発生しました';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getActionLogs,
    };
}