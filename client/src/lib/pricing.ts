/**
 * 引越し見積もり 料金計算モジュール
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

// 料金設定のキャッシュ
let currentSettings: PricingSettings | null = null;

/**
 * 料金設定を初期化
 */
export async function initializePricingSettings(): Promise<void> {
  currentSettings = await fetchPricingSettings();
}

/**
 * 現在の料金設定を取得
 */
function getSettings(): PricingSettings {
  if (!currentSettings) {
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
      distance_rate_to_50: 220,
      distance_rate_to_100: 170,
      distance_rate_to_150: 140,
      distance_rate_over_150: 120,
    };
  }
  return currentSettings;
}

/**
 * 距離超過料金を計算
 */
function calculateDistanceFee(distanceKm: number): {
  fee: number;
  breakdown: FeeBreakdownItem | null;
} {
  const settings = getSettings();
  const baseDistance = settings.base_distance || 30;

  // 基本距離以内なら追加料金なし
  if (distanceKm <= baseDistance) {
    return { fee: 0, breakdown: null };
  }

  let totalFee = 0;
  let currentDistance = baseDistance;
  const details: string[] = [];

  // 基本距離〜50kmまで
  if (distanceKm > currentDistance && currentDistance < 50) {
    const km = Math.min(distanceKm, 50) - currentDistance;
    const fee = km * settings.distance_rate_to_50;
    totalFee += fee;
    details.push(`${currentDistance + 1}〜50km: ${km}km × ${settings.distance_rate_to_50}円`);
    currentDistance = 50;
  }

  // 51km〜100kmまで
  if (distanceKm > currentDistance && currentDistance < 100) {
    const km = Math.min(distanceKm, 100) - currentDistance;
    const fee = km * settings.distance_rate_to_100;
    totalFee += fee;
    details.push(`51〜100km: ${km}km × ${settings.distance_rate_to_100}円`);
    currentDistance = 100;
  }

  // 101km〜150kmまで
  if (distanceKm > currentDistance && currentDistance < 150) {
    const km = Math.min(distanceKm, 150) - currentDistance;
    const fee = km * settings.distance_rate_to_150;
    totalFee += fee;
    details.push(`101〜150km: ${km}km × ${settings.distance_rate_to_150}円`);
    currentDistance = 150;
  }

  // 151km以上
  if (distanceKm > currentDistance) {
    const km = distanceKm - currentDistance;
    const fee = km * settings.distance_rate_over_150;
    totalFee += fee;
    details.push(`151km〜: ${km}km × ${settings.distance_rate_over_150}円`);
  }

  // 100円単位で切り捨て
  totalFee = Math.floor(totalFee / 100) * 100;

  return {
    fee: totalFee,
    breakdown: {
      name: '距離超過料金',
      amount: totalFee,
      note: `${Math.round(distanceKm)}km（${baseDistance}km超過分）`,
    },
  };
}

/**
 * 基本料金を計算（ヘルパープラン・お任せプラン共通）
 */
function calculateBaseFee(dates: MovingDates, plan: 'helper' | 'full'): {
  fee: number;
  breakdown: FeeBreakdownItem[];
  baseFee: number;
} {
  const settings = getSettings();
  const baseFee = settings.base_fee;
  const baseDistance = settings.base_distance || 30;

  const isBusy = isBusySeason(dates.pickupDate) || isBusySeason(dates.deliveryDate);
  const isWeekendHoliday = isWeekendOrHoliday(dates.pickupDate) || isWeekendOrHoliday(dates.deliveryDate);

  const busySeasonSurcharge = isBusy ? Math.floor((baseFee * settings.busy_season_rate) / 100) * 100 : 0;
  const weekendHolidaySurcharge = isWeekendHoliday ? Math.floor((baseFee * settings.weekend_holiday_rate) / 100) * 100 : 0;

  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = baseFee;

  // 基本料金
  breakdown.push({
    name: '基本料金',
    amount: baseFee,
    note: `${baseDistance}kmまで`,
  });

  // 繁忙期加算
  if (isBusy) {
    breakdown.push({
      name: `繁忙期加算（${Math.round(settings.busy_season_rate * 100)}%）`,
      amount: busySeasonSurcharge,
    });
    totalFee += busySeasonSurcharge;
  }

  // 土日祝加算
  if (isWeekendHoliday) {
    breakdown.push({
      name: `土日祝加算（${Math.round(settings.weekend_holiday_rate * 100)}%）`,
      amount: weekendHolidaySurcharge,
    });
    totalFee += weekendHolidaySurcharge;
  }

  // お任せプランの場合、追加料金
  if (plan === 'full') {
    breakdown.push({
      name: 'お任せプラン',
      amount: settings.omakase_base_fee,
      note: '作業員2名',
    });
    totalFee += settings.omakase_base_fee;
  }

  return {
    fee: totalFee,
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
  breakdown: FeeBreakdownItem[];
} {
  const settings = getSettings();
  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = 0;

  // 梱包サービス
  if (options.needsPacking) {
    const fee = settings.packing_fee || 0;
    breakdown.push({
      name: '梱包サービス',
      amount: fee,
    });
    totalFee += fee;
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

  const pickupSpecified = dates.pickupTimeSlot && dates.pickupTimeSlot !== 'anytime';
  const deliverySpecified = dates.deliveryTimeSlot && dates.deliveryTimeSlot !== 'anytime';

  if (pickupSpecified || deliverySpecified) {
    let timeLabel = '';
    let fee = 0;

    if (pickupSpecified && deliverySpecified) {
      const pickupLabel = dates.pickupTimeSlot === 'morning' ? '午前' : '午後';
      const deliveryLabel = dates.deliveryTimeSlot === 'morning' ? '午前' : '午後';
      if (pickupLabel === deliveryLabel) {
        timeLabel = pickupLabel;
      } else {
        timeLabel = '午前・午後';
      }
      fee = settings.time_slot_fee * 2;
    } else if (pickupSpecified) {
      timeLabel = dates.pickupTimeSlot === 'morning' ? '午前' : '午後';
      fee = settings.time_slot_fee;
    } else if (deliverySpecified) {
      timeLabel = dates.deliveryTimeSlot === 'morning' ? '午前' : '午後';
      fee = settings.time_slot_fee;
    }

    breakdown.push({
      name: `時間指定（${timeLabel}）`,
      amount: fee,
    });
    totalFee = fee;
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
      breakdown: null,
      note: HIGHWAY_FEE_CONFIG.unavailableText,
    };
  }

  return { fee: 0, breakdown: null, note: HIGHWAY_FEE_CONFIG.unavailableText };
}

/**
 * 日本の祝日を取得
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
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;
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
  if (days <= 0) return { fee: 0, breakdown: null, days: 0 };
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

  // 1. 基本料金（お任せプラン含む）
  const baseFeeResult = calculateBaseFee(movingDates, plan);
  breakdown.push(...baseFeeResult.breakdown);

  // 2. 距離超過料金（新規追加）
  const distanceFeeResult = calculateDistanceFee(distance.distanceKm);
  if (distanceFeeResult.breakdown) {
    breakdown.push(distanceFeeResult.breakdown);
  }

  // 3. 階数料金
  const floorFeeResult = calculateFloorFees(options);
  breakdown.push(...floorFeeResult.breakdown);

  // 4. オプション料金
  const optionFeeResult = calculateOptionFees(options);
  breakdown.push(...optionFeeResult.breakdown);

  // 5. 時間指定料金
  const timeSlotFeeResult = calculateTimeSlotFees(movingDates);
  breakdown.push(...timeSlotFeeResult.breakdown);

  // 6. 高速料金
  const highwayFeeResult = processHighwayFee(distance);
  if (highwayFeeResult.breakdown) {
    breakdown.push(highwayFeeResult.breakdown);
  }

  // 7. 積み置き料金
  const storageFeeResult = calculateStorageFee(movingDates);
  if (storageFeeResult.breakdown) {
    breakdown.push(storageFeeResult.breakdown);
  }

  // 合計計算
  const totalFee =
    baseFeeResult.fee +
    distanceFeeResult.fee +
    floorFeeResult.totalFee +
    optionFeeResult.totalFee +
    timeSlotFeeResult.totalFee +
    highwayFeeResult.fee +
    storageFeeResult.fee;

  const isWeekendHoliday = isWeekendOrHoliday(movingDates.pickupDate) || isWeekendOrHoliday(movingDates.deliveryDate);

  return {
    distanceKm: distance.distanceKm,
    baseFee: baseFeeResult.baseFee,
    optionFee: optionFeeResult.totalFee + floorFeeResult.totalFee + timeSlotFeeResult.totalFee + distanceFeeResult.fee,
    highwayFee: highwayFeeResult.fee,
    storageFee: storageFeeResult.fee,
    busySeasonFee: (isBusySeason(movingDates.pickupDate) || isBusySeason(movingDates.deliveryDate)) ? Math.round(settings.base_fee * settings.busy_season_rate) : 0,
    weekendHolidayFee: isWeekendHoliday ? Math.round(settings.base_fee * settings.weekend_holiday_rate) : 0,
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
 * 金額をフォーマット
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
