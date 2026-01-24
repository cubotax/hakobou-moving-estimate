/**
 * 料金設定をAPIから取得するモジュール
 */

import { API_CONFIG } from './config';

export interface PricingSettings {
    base_fee: number;
    base_distance: number;
    busy_season_rate: number;
    busy_season_start: string;
    busy_season_end: string;
    weekend_holiday_rate: number;
    storage_fee_per_day: number;
    packing_fee: number;
    floor_fee: number;
    free_floor_limit: number;
    omakase_base_fee: number;
    omakase_additional_fee: number;
    time_slot_fee: number;
    // 距離別単価
    distance_rate_to_50: number;
    distance_rate_to_100: number;
    distance_rate_to_150: number;
    distance_rate_over_150: number;
}

// キャッシュ（5分間有効）
let cachedSettings: PricingSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

/**
 * 料金設定をAPIから取得（キャッシュあり）
 */
export async function fetchPricingSettings(): Promise<PricingSettings> {
    const now = Date.now();

    // キャッシュが有効な場合はキャッシュを返す
    if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedSettings;
    }

    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/coupons/pricing`);
        const data = await res.json();

        if (data.success && data.settings) {
            // 文字列を数値に変換
            cachedSettings = {
                base_fee: parseInt(data.settings.base_fee) || 19800,
                base_distance: parseInt(data.settings.base_distance) || 30,
                busy_season_rate: parseFloat(data.settings.busy_season_rate) || 0.3,
                busy_season_start: data.settings.busy_season_start || '03-01',
                busy_season_end: data.settings.busy_season_end || '04-10',
                weekend_holiday_rate: parseFloat(data.settings.weekend_holiday_rate) || 0.1,
                storage_fee_per_day: parseInt(data.settings.storage_fee_per_day) || 3000,
                packing_fee: parseInt(data.settings.packing_fee) || 5000,
                floor_fee: parseInt(data.settings.floor_fee) || 3000,
                free_floor_limit: parseInt(data.settings.free_floor_limit) || 2,
                omakase_base_fee: parseInt(data.settings.omakase_base_fee) || 8000,
                omakase_additional_fee: parseInt(data.settings.omakase_additional_fee) || 4000,
                time_slot_fee: parseInt(data.settings.time_slot_fee) || 1000,
                // 距離別単価
                distance_rate_to_50: parseInt(data.settings.distance_rate_to_50) || 220,
                distance_rate_to_100: parseInt(data.settings.distance_rate_to_100) || 170,
                distance_rate_to_150: parseInt(data.settings.distance_rate_to_150) || 140,
                distance_rate_over_150: parseInt(data.settings.distance_rate_over_150) || 120,
            };
            cacheTimestamp = now;
            return cachedSettings;
        }
    } catch (err) {
        console.error('Failed to fetch pricing settings:', err);
    }

    // フォールバック（デフォルト値）
    return {
        base_fee: 19800,
        base_distance: 30,
        busy_season_rate: 0.3,
        busy_season_start: '03-01',
        busy_season_end: '04-10',
        weekend_holiday_rate: 0.1,
        storage_fee_per_day: 3000,
        packing_fee: 5000,
        floor_fee: 3000,
        free_floor_limit: 2,
        omakase_base_fee: 8000,
        omakase_additional_fee: 4000,
        time_slot_fee: 1000,
        // 距離別単価
        distance_rate_to_50: 220,
        distance_rate_to_100: 170,
        distance_rate_to_150: 140,
        distance_rate_over_150: 120,
    };
}

/**
 * キャッシュをクリア
 */
export function clearPricingCache(): void {
    cachedSettings = null;
    cacheTimestamp = 0;
}