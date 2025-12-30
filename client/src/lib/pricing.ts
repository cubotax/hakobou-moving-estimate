/**
 * 引越し見積もり 料金計算モジュール
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 拡張可能な設計
 * - 設定ファイルによる料金ルール管理
 */

import type { 
  EstimateOptions, 
  DistanceResult, 
  EstimateResult, 
  FeeBreakdownItem,
  MovingDates
} from './types';
import { PRICING_CONFIG, HIGHWAY_FEE_CONFIG, BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG } from './config';

/**
 * 基本料金を計算
 */
function calculateBaseFee(distanceKm: number): { fee: number; breakdown: FeeBreakdownItem | null } {
  const { baseFeeMode, fixedBaseFee, perKmRate } = PRICING_CONFIG;
  
  switch (baseFeeMode) {
    case 'none':
      return { fee: 0, breakdown: null };
    
    case 'fixed':
      return {
        fee: fixedBaseFee,
        breakdown: {
          name: '基本料金',
          amount: fixedBaseFee,
        },
      };
    
    case 'per_km':
      const fee = Math.round(distanceKm * perKmRate);
      return {
        fee,
        breakdown: {
          name: '距離料金',
          amount: fee,
          note: `${distanceKm.toFixed(1)}km × ${perKmRate}円/km`,
        },
      };
    
    default:
      return { fee: 0, breakdown: null };
  }
}

/**
 * オプション料金を計算
 */
function calculateOptionFees(options: EstimateOptions): { 
  totalFee: number; 
  breakdown: FeeBreakdownItem[] 
} {
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;
  
  for (const optionConfig of PRICING_CONFIG.optionFees) {
    // 条件が設定されている場合は評価
    if (optionConfig.condition) {
      if (optionConfig.condition(options)) {
        breakdown.push({
          name: optionConfig.label,
          amount: optionConfig.fee,
        });
        totalFee += optionConfig.fee;
      }
    }
  }
  
  return { totalFee, breakdown };
}

/**
 * 高速料金を処理
 */
function processHighwayFee(distance: DistanceResult): {
  fee: number;
  breakdown: FeeBreakdownItem | null;
  note?: string;
} {
  const { isInterPrefecture, highwayFee } = distance;
  
  // 県内移動の場合は高速料金なし
  if (!isInterPrefecture && HIGHWAY_FEE_CONFIG.onlyInterPrefecture) {
    return { fee: 0, breakdown: null };
  }
  
  // 高速料金が取得できた場合
  if (highwayFee !== null && highwayFee > 0) {
    return {
      fee: highwayFee,
      breakdown: {
        name: '高速道路料金',
        amount: highwayFee,
        note: 'ETC料金（概算）',
      },
    };
  }
  
  // 高速料金が取得できなかった場合
  if (HIGHWAY_FEE_CONFIG.treatUnavailableAsZero) {
    return {
      fee: 0,
      breakdown: {
        name: '高速道路料金',
        amount: 0,
        note: HIGHWAY_FEE_CONFIG.unavailableText,
      },
      note: HIGHWAY_FEE_CONFIG.unavailableText,
    };
  }
  
  return {
    fee: 0,
    breakdown: null,
    note: HIGHWAY_FEE_CONFIG.unavailableText,
  };
}

/**
 * 繁忙期かどうかを判定
 */
export function isBusySeason(date: string): boolean {
  if (!date) return false;
  
  const targetDate = new Date(date);
  const month = targetDate.getMonth() + 1; // 0-indexed
  const day = targetDate.getDate();
  
  const [startMonth, startDay] = BUSY_SEASON_CONFIG.startDate.split('-').map(Number);
  const [endMonth, endDay] = BUSY_SEASON_CONFIG.endDate.split('-').map(Number);
  
  // 月-日を数値化して比較（例: 3月1日 = 301, 4月10日 = 410）
  const targetValue = month * 100 + day;
  const startValue = startMonth * 100 + startDay;
  const endValue = endMonth * 100 + endDay;
  
  return targetValue >= startValue && targetValue <= endValue;
}

/**
 * 積み置き日数を計算
 */
export function calculateStorageDays(dates: MovingDates): number {
  if (!dates.pickupDate || !dates.deliveryDate) return 0;
  
  const pickup = new Date(dates.pickupDate);
  const delivery = new Date(dates.deliveryDate);
  
  // 日数差を計算（同日は0日）
  const diffTime = delivery.getTime() - pickup.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 同日配送は積み置きなし
  return Math.max(0, diffDays);
}

/**
 * 繁忙期料金を計算
 */
function calculateBusySeasonFee(
  baseFee: number, 
  optionFee: number, 
  dates: MovingDates
): { fee: number; breakdown: FeeBreakdownItem | null; isBusy: boolean } {
  const isBusy = isBusySeason(dates.pickupDate);
  
  if (!isBusy) {
    return { fee: 0, breakdown: null, isBusy: false };
  }
  
  // 基本料金とオプション料金の合計に対して割増
  const baseAmount = baseFee + optionFee;
  const surcharge = Math.round(baseAmount * BUSY_SEASON_CONFIG.surchargeRate);
  
  return {
    fee: surcharge,
    breakdown: {
      name: BUSY_SEASON_CONFIG.label,
      amount: surcharge,
      note: `(${formatCurrency(baseAmount)} × ${BUSY_SEASON_CONFIG.surchargeRate * 100}%)`,
    },
    isBusy: true,
  };
}

/**
 * 積み置き料金を計算
 */
function calculateStorageFee(dates: MovingDates): { 
  fee: number; 
  breakdown: FeeBreakdownItem | null; 
  days: number 
} {
  const days = calculateStorageDays(dates);
  
  if (days <= 0) {
    return { fee: 0, breakdown: null, days: 0 };
  }
  
  const fee = days * STORAGE_FEE_CONFIG.perDayFee;
  
  return {
    fee,
    breakdown: {
      name: STORAGE_FEE_CONFIG.label,
      amount: fee,
      note: `${days}日 × ${formatCurrency(STORAGE_FEE_CONFIG.perDayFee)}/日`,
    },
    days,
  };
}

/**
 * 見積もりを計算
 * 
 * @param distance - 距離計算結果
 * @param options - 見積もりオプション
 * @param dates - 引越し日程（オプション）
 * @returns 見積もり結果
 */
export function calculateEstimate(
  distance: DistanceResult,
  options: EstimateOptions,
  dates?: MovingDates
): EstimateResult {
  const breakdown: FeeBreakdownItem[] = [];
  
  // デフォルトの日付（今日）
  const movingDates: MovingDates = dates || {
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
  };
  
  // 1. 基本料金
  const baseFeeResult = calculateBaseFee(distance.distanceKm);
  if (baseFeeResult.breakdown) {
    breakdown.push(baseFeeResult.breakdown);
  }
  
  // 2. オプション料金
  const optionFeeResult = calculateOptionFees(options);
  breakdown.push(...optionFeeResult.breakdown);
  
  // 3. 高速料金
  const highwayFeeResult = processHighwayFee(distance);
  if (highwayFeeResult.breakdown) {
    breakdown.push(highwayFeeResult.breakdown);
  }
  
  // 4. 積み置き料金
  const storageFeeResult = calculateStorageFee(movingDates);
  if (storageFeeResult.breakdown) {
    breakdown.push(storageFeeResult.breakdown);
  }
  
  // 5. 繁忙期料金（基本料金+オプション料金に対して）
  const busySeasonFeeResult = calculateBusySeasonFee(
    baseFeeResult.fee, 
    optionFeeResult.totalFee,
    movingDates
  );
  if (busySeasonFeeResult.breakdown) {
    breakdown.push(busySeasonFeeResult.breakdown);
  }
  
  // 合計計算
  const totalFee = 
    baseFeeResult.fee + 
    optionFeeResult.totalFee + 
    highwayFeeResult.fee + 
    storageFeeResult.fee +
    busySeasonFeeResult.fee;
  
  return {
    distanceKm: distance.distanceKm,
    baseFee: baseFeeResult.fee,
    optionFee: optionFeeResult.totalFee,
    highwayFee: highwayFeeResult.fee,
    storageFee: storageFeeResult.fee,
    busySeasonFee: busySeasonFeeResult.fee,
    totalFee,
    breakdown,
    highwayFeeNote: highwayFeeResult.note,
    isInterPrefecture: distance.isInterPrefecture,
    isBusySeason: busySeasonFeeResult.isBusy,
    storageDays: storageFeeResult.days,
  };
}

/**
 * 金額をフォーマット（日本円表示）
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 距離をフォーマット
 */
export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}
