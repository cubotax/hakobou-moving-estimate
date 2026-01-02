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
 * 距離料金を計算（累進課金方式）
 */
function calculateDistanceFee(distanceKm: number, dates: MovingDates): { 
  fee: number; 
  breakdown: FeeBreakdownItem[];
  baseFee: number;
} {
  const isBusy = isBusySeason(dates.pickupDate);
  const baseFee = PRICING_CONFIG.baseFee;
  const busySeasonSurcharge = isBusy ? Math.round(baseFee * BUSY_SEASON_CONFIG.surchargeRate) : 0;
  
  let distanceTotal = baseFee;
  const breakdown: FeeBreakdownItem[] = [];

  // 基本料金の追加
  breakdown.push({
    name: '基本料金',
    amount: baseFee,
    note: '30kmまで',
  });

  // 繁忙期加算の追加
  if (isBusy) {
    breakdown.push({
      name: BUSY_SEASON_CONFIG.label,
      amount: busySeasonSurcharge,
      note: `(¥19,800 × ${BUSY_SEASON_CONFIG.surchargeRate * 100}%)`,
    });
    distanceTotal += busySeasonSurcharge;
  }
  
  // 累進課金の計算（31km以降）
  let progressiveFee = 0;
  for (const range of PRICING_CONFIG.distanceRates) {
    if (distanceKm > range.min && range.rate > 0) {
      const applicableDistance = Math.min(distanceKm, range.max) - range.min;
      if (applicableDistance > 0) {
        const fee = applicableDistance * range.rate;
        progressiveFee += fee;
      }
    }
  }

  if (progressiveFee > 0) {
    breakdown.push({
      name: '距離超過料金',
      amount: progressiveFee,
      note: `${distanceKm.toFixed(1)}km（累進課金）`,
    });
    distanceTotal += progressiveFee;
  }

  return {
    fee: distanceTotal,
    breakdown,
    baseFee: baseFee + busySeasonSurcharge,
  };
}

/**
 * 階数料金を計算
 */
function calculateFloorFees(options: EstimateOptions): { 
  totalFee: number; 
  breakdown: FeeBreakdownItem[] 
} {
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;
  const { freeUntilFloor, feePerFloor } = PRICING_CONFIG.floorFeeRule;

  // 集荷先
  if (!options.hasElevatorPickup && options.floorPickup > freeUntilFloor) {
    const fee = (options.floorPickup - freeUntilFloor) * feePerFloor;
    breakdown.push({
      name: '集荷先 階数料金',
      amount: fee,
      note: `${options.floorPickup}階（階段作業）`,
    });
    totalFee += fee;
  }

  // お届け先
  if (!options.hasElevatorDelivery && options.floorDelivery > freeUntilFloor) {
    const fee = (options.floorDelivery - freeUntilFloor) * feePerFloor;
    breakdown.push({
      name: '届け先 階数料金',
      amount: fee,
      note: `${options.floorDelivery}階（階段作業）`,
    });
    totalFee += fee;
  }

  return { totalFee, breakdown };
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
    if (optionConfig.condition?.(options)) {
      breakdown.push({
        name: optionConfig.label,
        amount: optionConfig.fee,
      });
      totalFee += optionConfig.fee;
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
export function isBusySeason(date: string | Date): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();
  
  // 時刻を 00:00:00 にリセットした比較用の日付オブジェクトを作成
  const moveDate = new Date(year, month, day, 0, 0, 0, 0);
  
  // 3/1 00:00:00
  const start = new Date(year, 2, 1, 0, 0, 0, 0);
  // 4/10 23:59:59 (日付比較なので 4/10 00:00:00 でも可だが、仕様に合わせる)
  const end = new Date(year, 3, 10, 0, 0, 0, 0);
  
  return moveDate >= start && moveDate <= end;
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
  
  // 1. 距離料金（基本料金含む累進課金 ＋ 繁忙期加算）
  const distanceFeeResult = calculateDistanceFee(distance.distanceKm, movingDates);
  breakdown.push(...distanceFeeResult.breakdown);
  
  // 2. 階数料金
  const floorFeeResult = calculateFloorFees(options);
  breakdown.push(...floorFeeResult.breakdown);
  
  // 3. オプション料金（梱包など）
  const optionFeeResult = calculateOptionFees(options);
  breakdown.push(...optionFeeResult.breakdown);
  
  // 4. 高速料金
  const highwayFeeResult = processHighwayFee(distance);
  if (highwayFeeResult.breakdown) {
    breakdown.push(highwayFeeResult.breakdown);
  }
  
  // 5. 積み置き料金
  const storageFeeResult = calculateStorageFee(movingDates);
  if (storageFeeResult.breakdown) {
    breakdown.push(storageFeeResult.breakdown);
  }
  
  // 合計計算
  const totalFee = 
    distanceFeeResult.fee + 
    floorFeeResult.totalFee +
    optionFeeResult.totalFee + 
    highwayFeeResult.fee + 
    storageFeeResult.fee;
  
  return {
    distanceKm: distance.distanceKm,
    baseFee: distanceFeeResult.baseFee,
    optionFee: optionFeeResult.totalFee + floorFeeResult.totalFee,
    highwayFee: highwayFeeResult.fee,
    storageFee: storageFeeResult.fee,
    busySeasonFee: isBusySeason(movingDates.pickupDate) ? Math.round(PRICING_CONFIG.baseFee * BUSY_SEASON_CONFIG.surchargeRate) : 0,
    totalFee,
    breakdown,
    highwayFeeNote: highwayFeeResult.note,
    isInterPrefecture: distance.isInterPrefecture,
    isBusySeason: isBusySeason(movingDates.pickupDate),
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
