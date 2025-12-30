/**
 * 引越し見積もり 料金計算モジュール
 * 
 * Design Philosophy: 和モダン・ミニマリズム
 * - 拡張可能な設計
 * - 設定ファイルによる料金ルール管理
 */

import type { 
  EstimateOptions, 
  DistanceResult, 
  EstimateResult, 
  FeeBreakdownItem 
} from './types';
import { PRICING_CONFIG, HIGHWAY_FEE_CONFIG } from './config';

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
 * 見積もりを計算
 * 
 * @param distance - 距離計算結果
 * @param options - 見積もりオプション
 * @returns 見積もり結果
 */
export function calculateEstimate(
  distance: DistanceResult,
  options: EstimateOptions
): EstimateResult {
  const breakdown: FeeBreakdownItem[] = [];
  
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
  
  // 合計計算
  const totalFee = baseFeeResult.fee + optionFeeResult.totalFee + highwayFeeResult.fee;
  
  return {
    distanceKm: distance.distanceKm,
    baseFee: baseFeeResult.fee,
    optionFee: optionFeeResult.totalFee,
    highwayFee: highwayFeeResult.fee,
    totalFee,
    breakdown,
    highwayFeeNote: highwayFeeResult.note,
    isInterPrefecture: distance.isInterPrefecture,
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
