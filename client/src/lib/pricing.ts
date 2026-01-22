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
import { PRICING_CONFIG, HIGHWAY_FEE_CONFIG, BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG, WEEKEND_HOLIDAY_CONFIG, OMAKASE_PLAN_CONFIG } from './config';

/**
 * お任せプランの料金を計算
 * - 50kmまで：8,000円（基本料金）
 * - 50km超過：50kmごとに4,000円追加
 */
function calculateOmakasePlanFee(distanceKm: number, dates: MovingDates): {
  fee: number;
  breakdown: FeeBreakdownItem[];
  baseFee: number;
} {
  const { baseFee, baseDistance, additionalFee, distanceUnit } = OMAKASE_PLAN_CONFIG;

  // 集荷日またはお届け日のどちらかが繁忙期なら繁忙期料金を適用
  const isBusy = isBusySeason(dates.pickupDate) || isBusySeason(dates.deliveryDate);

  // 集荷日またはお届け日のどちらかが土日祝なら土日祝料金を適用
  const isWeekendHoliday = isWeekendOrHoliday(dates.pickupDate) || isWeekendOrHoliday(dates.deliveryDate);

  const busySeasonSurcharge = isBusy ? Math.floor((baseFee * BUSY_SEASON_CONFIG.surchargeRate) / 100) * 100 : 0;
  const weekendHolidaySurcharge = isWeekendHoliday ? Math.floor((baseFee * WEEKEND_HOLIDAY_CONFIG.surchargeRate) / 100) * 100 : 0;

  const breakdown: FeeBreakdownItem[] = [];
  let totalFee = baseFee;

  // お任せプラン基本料金
  breakdown.push({
    name: 'お任せプラン基本料金',
    amount: baseFee,
    note: `${baseDistance}kmまで`,
  });

  // 繁忙期加算
  if (isBusy) {
    breakdown.push({
      name: BUSY_SEASON_CONFIG.label,
      amount: busySeasonSurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${BUSY_SEASON_CONFIG.surchargeRate * 100}%)`,
    });
    totalFee += busySeasonSurcharge;
  }

  // 土日祝加算
  if (isWeekendHoliday) {
    breakdown.push({
      name: WEEKEND_HOLIDAY_CONFIG.label,
      amount: weekendHolidaySurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${WEEKEND_HOLIDAY_CONFIG.surchargeRate * 100}%)`,
    });
    totalFee += weekendHolidaySurcharge;
  }

  // 距離追加料金（50km超過分）
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
  // 集荷日またはお届け日のどちらかが繁忙期なら繁忙期料金を適用
  const isBusy = isBusySeason(dates.pickupDate) || isBusySeason(dates.deliveryDate);

  // 集荷日またはお届け日のどちらかが土日祝なら土日祝料金を適用
  const isWeekendHoliday = isWeekendOrHoliday(dates.pickupDate) || isWeekendOrHoliday(dates.deliveryDate);

  const baseFee = PRICING_CONFIG.baseFee;
  const busySeasonSurcharge = isBusy ? Math.floor((baseFee * BUSY_SEASON_CONFIG.surchargeRate) / 100) * 100 : 0;
  const weekendHolidaySurcharge = isWeekendHoliday ? Math.floor((baseFee * WEEKEND_HOLIDAY_CONFIG.surchargeRate) / 100) * 100 : 0;

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
      note: `(¥${baseFee.toLocaleString()} × ${BUSY_SEASON_CONFIG.surchargeRate * 100}%)`,
    });
    distanceTotal += busySeasonSurcharge;
  }

  // 土日祝加算の追加
  if (isWeekendHoliday) {
    breakdown.push({
      name: WEEKEND_HOLIDAY_CONFIG.label,
      amount: weekendHolidaySurcharge,
      note: `(¥${baseFee.toLocaleString()} × ${WEEKEND_HOLIDAY_CONFIG.surchargeRate * 100}%)`,
    });
    distanceTotal += weekendHolidaySurcharge;
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

  // 100円未満切り捨て
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
    // 100円未満切り捨て
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
 * 日本の祝日を取得（簡易版：主要な祝日のみ）
 */
function getJapaneseHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // 固定祝日
  holidays.push(new Date(year, 0, 1));   // 元日
  holidays.push(new Date(year, 1, 11));  // 建国記念の日
  holidays.push(new Date(year, 1, 23));  // 天皇誕生日
  holidays.push(new Date(year, 3, 29));  // 昭和の日
  holidays.push(new Date(year, 4, 3));   // 憲法記念日
  holidays.push(new Date(year, 4, 4));   // みどりの日
  holidays.push(new Date(year, 4, 5));   // こどもの日
  holidays.push(new Date(year, 7, 11));  // 山の日
  holidays.push(new Date(year, 10, 3));  // 文化の日
  holidays.push(new Date(year, 10, 23)); // 勤労感謝の日

  // ハッピーマンデー（第2月曜など）
  holidays.push(getNthWeekday(year, 0, 1, 2));  // 成人の日（1月第2月曜）
  holidays.push(getNthWeekday(year, 6, 1, 3));  // 海の日（7月第3月曜）
  holidays.push(getNthWeekday(year, 8, 1, 3));  // 敬老の日（9月第3月曜）
  holidays.push(getNthWeekday(year, 9, 1, 2));  // スポーツの日（10月第2月曜）

  // 春分の日・秋分の日（概算）
  holidays.push(new Date(year, 2, 20));  // 春分の日（概算）
  holidays.push(new Date(year, 8, 23));  // 秋分の日（概算）

  return holidays;
}

/**
 * 第N週の特定曜日を取得
 */
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

  // 土曜(6)または日曜(0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // 祝日チェック
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
 * @param plan - プラン種別（オプション）: 'helper' | 'full'
 * @returns 見積もり結果
 */
export function calculateEstimate(
  distance: DistanceResult,
  options: EstimateOptions,
  dates?: MovingDates,
  plan: 'helper' | 'full' = 'helper'
): EstimateResult {
  const breakdown: FeeBreakdownItem[] = [];

  // デフォルトの日付（今日）
  const movingDates: MovingDates = dates || {
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
  };

  // 1. プラン別の距離料金計算
  const distanceFeeResult = plan === 'full'
    ? calculateOmakasePlanFee(distance.distanceKm, movingDates)
    : calculateDistanceFee(distance.distanceKm, movingDates);
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

  // 土日祝判定
  const isWeekendHoliday = isWeekendOrHoliday(movingDates.pickupDate) || isWeekendOrHoliday(movingDates.deliveryDate);

  return {
    distanceKm: distance.distanceKm,
    baseFee: distanceFeeResult.baseFee,
    optionFee: optionFeeResult.totalFee + floorFeeResult.totalFee,
    highwayFee: highwayFeeResult.fee,
    storageFee: storageFeeResult.fee,
    busySeasonFee: (isBusySeason(movingDates.pickupDate) || isBusySeason(movingDates.deliveryDate)) ? Math.round(PRICING_CONFIG.baseFee * BUSY_SEASON_CONFIG.surchargeRate) : 0,
    weekendHolidayFee: isWeekendHoliday ? Math.round(PRICING_CONFIG.baseFee * WEEKEND_HOLIDAY_CONFIG.surchargeRate) : 0,
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
