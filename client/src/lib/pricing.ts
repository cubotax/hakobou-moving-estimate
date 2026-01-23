/**
 * 引越し見積もり 料金計算モジュール
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 拡張可能な設計
 * - APIから料金設定を取得して動的に計算
 */

import type {
  EstimateOptions,
  DistanceResult,
  EstimateResult,
  FeeBreakdownItem,
  MovingDates
} from './types';
import { HIGHWAY_FEE_CONFIG } from './config';
import { fetchPricingSettings, PricingSettings } from './pricingApi';

// 料金設定のキャッシュ（同期的にアクセスするため）
let currentSettings: PricingSettings | null = null;

/**
 * 料金設定を初期化（アプリ起動時に呼び出す）
 */
export async function initializePricingSettings(): Promise<void> {
  currentSettings = await fetchPricingSettings();
}

/**
 * 現在の料金設定を取得（同期）
 */
function getSettings(): PricingSettings {
  if (!currentSettings) {
    // フォールバック
    return {
      base_fee: 19800,
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
    };
  }
  return currentSettings;
}

/**
 * お任せプランの料金を計算
 */
function calculateOmakasePlanFee(distanceKm: number, dates: MovingDates): {
  fee: number;
  breakdown: FeeBreakdownItem[];
  baseFee: number;
} {
  const settings = getSettings();
  const baseFee = settings.omakase_base_fee;
  const baseDistance = 50;
  const additionalFee = settings.omakase_additional_fee;
  const distanceUnit = 50;

  const isBusy = isBusySeason(dates.pickupDate) || isBusySeason(dates.deliveryDate);
  const isWeekendHoliday = isWeekendOrHoliday(dates.pickupDate) || isWeekendOrHoliday(dates.deliveryDate);

  const busySeasonSurcharge = isBusy ? Math.floor((baseFee * settings.busy_season_rate) / 100) * 100 : 0;
  const weekendHolidaySurcharge = isWeekendHoliday ? Math.floor((baseFee * settings.weekend_holiday_rate) / 100) * 100 : 0;

  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = baseFee;

  breakdown.push({
    name: 'お任せプラン基本料金',
    amount: baseFee,
    note: `${baseDistance}kmまで`,
  });

  if (isBusy) {
    breakdown.push({
      name: `繁忙期加算（基本料金${Math.round(settings.busy_season_rate * 100)}%増）`,
      amount: busySeasonSurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${settings.busy_season_rate * 100}%)`,
    });
    totalFee += busySeasonSurcharge;
  }

  if (isWeekendHoliday) {
    breakdown.push({
      name: `土日祝加算（基本料金${Math.round(settings.weekend_holiday_rate * 100)}%増）`,
      amount: weekendHolidaySurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${settings.weekend_holiday_rate * 100}%)`,
    });
    totalFee += weekendHolidaySurcharge;
  }

  if (distanceKm > baseDistance) {
    const excessDistance = distanceKm - baseDistance;
    const additionalUnits = Math.ceil(excessDistance / distanceUnit);
    const additionalTotal = additionalFee * additionalUnits;

    breakdown.push({
      name: '距離追加料金',
      amount: additionalTotal,
      note: `${baseDistance}km超過分（${additionalUnits}×${distanceUnit}km）`,
    });
    totalFee += additionalTotal;
  }

  return {
    fee: totalFee,
    breakdown,
    baseFee: baseFee + busySeasonSurcharge + weekendHolidaySurcharge,
  };
}

/**
 * 距離料金を計算（累進課金方式）- ヘルパープラン用
 */
function calculateDistanceFee(distanceKm: number, dates: MovingDates): {
  fee: number;
  breakdown: FeeBreakdownItem[];
  baseFee: number;
} {
  const settings = getSettings();
  const baseFee = settings.base_fee;

  const isBusy = isBusySeason(dates.pickupDate) || isBusySeason(dates.deliveryDate);
  const isWeekendHoliday = isWeekendOrHoliday(dates.pickupDate) || isWeekendOrHoliday(dates.deliveryDate);

  const busySeasonSurcharge = isBusy ? Math.floor((baseFee * settings.busy_season_rate) / 100) * 100 : 0;
  const weekendHolidaySurcharge = isWeekendHoliday ? Math.floor((baseFee * settings.weekend_holiday_rate) / 100) * 100 : 0;

  let distanceTotal = baseFee;
  const breakdown: FeeBreakdownItem[] = [];

  breakdown.push({
    name: '基本料金',
    amount: baseFee,
    note: '30kmまで',
  });

  if (isBusy) {
    breakdown.push({
      name: `繁忙期加算（基本料金${Math.round(settings.busy_season_rate * 100)}%増）`,
      amount: busySeasonSurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${settings.busy_season_rate * 100}%)`,
    });
    distanceTotal += busySeasonSurcharge;
  }

  if (isWeekendHoliday) {
    breakdown.push({
      name: `土日祝加算（基本料金${Math.round(settings.weekend_holiday_rate * 100)}%増）`,
      amount: weekendHolidaySurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${settings.weekend_holiday_rate * 100}%)`,
    });
    distanceTotal += weekendHolidaySurcharge;
  }

  // 累進課金の計算（31km以降）
  const distanceRates = [
    { min: 0, max: 30, rate: 0 },
    { min: 30, max: 50, rate: 200 },
    { min: 50, max: 100, rate: 170 },
    { min: 100, max: 150, rate: 140 },
    { min: 150, max: Infinity, rate: 120 },
  ];

  let progressiveFee = 0;
  for (const range of distanceRates) {
    if (distanceKm > range.min && range.rate > 0) {
      const applicableDistance = Math.min(distanceKm, range.max) - range.min;
      if (applicableDistance > 0) {
        const fee = applicableDistance * range.rate;
        progressiveFee += fee;
      }
    }
  }

  progressiveFee = Math.floor(progressiveFee / 100) * 100;

  if (progressiveFee > 0) {
    breakdown.push({
      name: '距離加算料金',
      amount: progressiveFee,
      note: `${distanceKm.toFixed(1)}km（累進課金）`,
    });
    distanceTotal += progressiveFee;
  }

  return {
    fee: distanceTotal,
    breakdown,
    baseFee: baseFee + busySeasonSurcharge + weekendHolidaySurcharge,
  };
}

/**
 * 階数料金を計算
 */
function calculateFloorFees(options: EstimateOptions): {
  totalFee: number;
  breakdown: FeeBreakdownItem[]
} {
  const settings = getSettings();
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;
  const freeUntilFloor = settings.free_floor_limit;
  const feePerFloor = settings.floor_fee;

  if (!options.hasElevatorPickup && options.floorPickup > freeUntilFloor) {
    const fee = (options.floorPickup - freeUntilFloor) * feePerFloor;
    breakdown.push({
      name: '集荷先 階数料金',
      amount: fee,
      note: `${options.floorPickup}階（階段作業）`,
    });
    totalFee += fee;
  }

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
  const settings = getSettings();
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;

  if (options.needsPacking) {
    breakdown.push({
      name: '梱包サービス',
      amount: settings.packing_fee,
    });
    totalFee += settings.packing_fee;
  }

  return { totalFee, breakdown };
}

/**
 * 時間指定料金を計算
 */
function calculateTimeSlotFees(dates: MovingDates): {
  totalFee: number;
  breakdown: FeeBreakdownItem[]
} {
  const settings = getSettings();
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;

  // 集荷の時間指定
  if (dates.pickupTimeSlot && dates.pickupTimeSlot !== 'anytime') {
    const timeLabel = dates.pickupTimeSlot === 'morning' ? '午前' : '午後';
    breakdown.push({
      name: `集荷 時間指定（${timeLabel}）`,
      amount: settings.time_slot_fee,
    });
    totalFee += settings.time_slot_fee;
  }

  // 配達の時間指定
  if (dates.deliveryTimeSlot && dates.deliveryTimeSlot !== 'anytime') {
    const timeLabel = dates.deliveryTimeSlot === 'morning' ? '午前' : '午後';
    breakdown.push({
      name: `配達 時間指定（${timeLabel}）`,
      amount: settings.time_slot_fee,
    });
    totalFee += settings.time_slot_fee;
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

  if (!isInterPrefecture && HIGHWAY_FEE_CONFIG.onlyInterPrefecture) {
    return { fee: 0, breakdown: null };
  }

  if (highwayFee !== null && highwayFee > 0) {
    const roundedHighwayFee = Math.floor(highwayFee / 100) * 100;

    return {
      fee: roundedHighwayFee,
      breakdown: {
        name: '高速道路料金',
        amount: roundedHighwayFee,
        note: 'ETC料金（概算）',
      },
    };
  }

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
 * 日本の祝日を取得（簡易版）
 */
function getJapaneseHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  holidays.push(new Date(year, 0, 1));
  holidays.push(new Date(year, 1, 11));
  holidays.push(new Date(year, 1, 23));
  holidays.push(new Date(year, 3, 29));
  holidays.push(new Date(year, 4, 3));
  holidays.push(new Date(year, 4, 4));
  holidays.push(new Date(year, 4, 5));
  holidays.push(new Date(year, 7, 11));
  holidays.push(new Date(year, 10, 3));
  holidays.push(new Date(year, 10, 23));

  holidays.push(getNthWeekday(year, 0, 1, 2));
  holidays.push(getNthWeekday(year, 6, 1, 3));
  holidays.push(getNthWeekday(year, 8, 1, 3));
  holidays.push(getNthWeekday(year, 9, 1, 2));

  holidays.push(new Date(year, 2, 20));
  holidays.push(new Date(year, 8, 23));

  return holidays;
}

function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, day);
}

/**
 * 土日祝かどうかを判定
 */
export function isWeekendOrHoliday(date: string | Date): boolean {
  if (!date) return false;

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = targetDate.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const year = targetDate.getFullYear();
  const holidays = getJapaneseHolidays(year);

  return holidays.some(holiday =>
    holiday.getFullYear() === targetDate.getFullYear() &&
    holiday.getMonth() === targetDate.getMonth() &&
    holiday.getDate() === targetDate.getDate()
  );
}

/**
 * 繁忙期かどうかを判定
 */
export function isBusySeason(date: string | Date): boolean {
  if (!date) return false;

  const settings = getSettings();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  const moveDate = new Date(year, month, day, 0, 0, 0, 0);

  const [startMonth, startDay] = settings.busy_season_start.split('-').map(Number);
  const [endMonth, endDay] = settings.busy_season_end.split('-').map(Number);

  const start = new Date(year, startMonth - 1, startDay, 0, 0, 0, 0);
  const end = new Date(year, endMonth - 1, endDay, 0, 0, 0, 0);

  return moveDate >= start && moveDate <= end;
}

/**
 * 積み置き日数を計算
 */
export function calculateStorageDays(dates: MovingDates): number {
  if (!dates.pickupDate || !dates.deliveryDate) return 0;

  const pickup = new Date(dates.pickupDate);
  const delivery = new Date(dates.deliveryDate);

  const diffTime = delivery.getTime() - pickup.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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
  const settings = getSettings();
  const days = calculateStorageDays(dates);

  if (days <= 0) {
    return { fee: 0, breakdown: null, days: 0 };
  }

  const fee = days * settings.storage_fee_per_day;

  return {
    fee,
    breakdown: {
      name: '積み置き料金',
      amount: fee,
      note: `${days}日 × ${formatCurrency(settings.storage_fee_per_day)}/日`,
    },
    days,
  };
}

/**
 * 見積もりを計算
 */
export function calculateEstimate(
  distance: DistanceResult,
  options: EstimateOptions,
  dates?: MovingDates,
  plan: 'helper' | 'full' = 'helper'
): EstimateResult {
  const settings = getSettings();
  const breakdown: FeeBreakdownItem[] = [];

  const movingDates: MovingDates = dates || {
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
  };

  const distanceFeeResult = plan === 'full'
    ? calculateOmakasePlanFee(distance.distanceKm, movingDates)
    : calculateDistanceFee(distance.distanceKm, movingDates);
  breakdown.push(...distanceFeeResult.breakdown);

  const floorFeeResult = calculateFloorFees(options);
  breakdown.push(...floorFeeResult.breakdown);

  const optionFeeResult = calculateOptionFees(options);
  breakdown.push(...optionFeeResult.breakdown);

  // 時間指定料金を追加
  const timeSlotFeeResult = calculateTimeSlotFees(movingDates);
  breakdown.push(...timeSlotFeeResult.breakdown);

  const highwayFeeResult = processHighwayFee(distance);
  if (highwayFeeResult.breakdown) {
    breakdown.push(highwayFeeResult.breakdown);
  }

  const storageFeeResult = calculateStorageFee(movingDates);
  if (storageFeeResult.breakdown) {
    breakdown.push(storageFeeResult.breakdown);
  }

  const totalFee =
    distanceFeeResult.fee +
    floorFeeResult.totalFee +
    optionFeeResult.totalFee +
    timeSlotFeeResult.totalFee +
    highwayFeeResult.fee +
    storageFeeResult.fee;

  const isWeekendHoliday = isWeekendOrHoliday(movingDates.pickupDate) || isWeekendOrHoliday(movingDates.deliveryDate);
  const baseFeeForCalc = plan === 'full' ? settings.omakase_base_fee : settings.base_fee;

  return {
    distanceKm: distance.distanceKm,
    baseFee: distanceFeeResult.baseFee,
    optionFee: optionFeeResult.totalFee + floorFeeResult.totalFee + timeSlotFeeResult.totalFee,
    highwayFee: highwayFeeResult.fee,
    storageFee: storageFeeResult.fee,
    busySeasonFee: (isBusySeason(movingDates.pickupDate) || isBusySeason(movingDates.deliveryDate)) ? Math.round(baseFeeForCalc * settings.busy_season_rate) : 0,
    weekendHolidayFee: isWeekendHoliday ? Math.round(baseFeeForCalc * settings.weekend_holiday_rate) : 0,
    totalFee,
    breakdown,
    highwayFeeNote: highwayFeeResult.note,
    isInterPrefecture: distance.isInterPrefecture,
    isBusySeason: isBusySeason(movingDates.pickupDate) || isBusySeason(movingDates.deliveryDate),
    isWeekendOrHoliday: isWeekendHoliday,
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
