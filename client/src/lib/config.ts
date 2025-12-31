/**
 * 引越し見積もりシステム 設定ファイル
 * 
 * このファイルで料金ルールを一元管理します。
 * ハードコードを避け、ここで変更することで料金体系を調整できます。
 */

import type { PricingConfig, OptionFeeConfig, EstimateOptions } from './types';

// ============================================
// 都道府県リスト
// ============================================

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
] as const;

export type Prefecture = typeof PREFECTURES[number];

// ============================================
// オプション料金設定
// ============================================

/**
 * オプション料金の定義
 * 
 * 各オプションは以下を持ちます：
 * - id: 一意の識別子
 * - label: 表示名
 * - fee: 料金（円）
 * - condition: 適用条件（オプション）
 */
export const OPTION_FEES: OptionFeeConfig[] = [
  {
    id: 'packing',
    label: '梱包サービス',
    fee: 1000,
    condition: (options: EstimateOptions) => options.needsPacking === true,
  },
  {
    id: 'floor_pickup',
    label: '集荷先 階段作業（2階以上）',
    fee: 1000,
    condition: (options: EstimateOptions) => 
      options.floorPickup >= 2 && !options.hasElevatorPickup,
  },
  {
    id: 'floor_delivery',
    label: 'お届け先 階段作業（2階以上）',
    fee: 1000,
    condition: (options: EstimateOptions) => 
      options.floorDelivery >= 2 && !options.hasElevatorDelivery,
  },
  // 将来の拡張例
  // {
  //   id: 'piano',
  //   label: 'ピアノ搬送',
  //   fee: 15000,
  //   condition: (options: EstimateOptions) => options.hasPiano === true,
  // },
  // {
  //   id: 'aircon',
  //   label: 'エアコン取り外し/取り付け',
  //   fee: 8000,
  //   condition: (options: EstimateOptions) => options.hasAircon === true,
  // },
];

// ============================================
// 料金設定
// ============================================

/**
 * 料金設定
 * 
 * baseFeeMode:
 * - 'none': 基本料金なし（オプションと高速料金のみ）
 * - 'fixed': 固定基本料金
 * - 'per_km': 距離に応じた基本料金
 */
export const PRICING_CONFIG: PricingConfig & { storagePerDay: number } = {
  // MVPでは 'none' を使用。後で 'per_km' に変更可能
  baseFeeMode: 'per_km',
  
  // 固定基本料金（baseFeeMode が 'fixed' の場合に使用）
  fixedBaseFee: 10000,
  
  // 距離単価（baseFeeMode が 'per_km' の場合に使用）
  // 例: 100円/km
  perKmRate: 100,
  
  // オプション料金設定
  optionFees: OPTION_FEES,
  
  // 積み置き料金（1日あたり）
  storagePerDay: 3000,
};

// ============================================
// 繁忙期設定
// ============================================

export const BUSY_SEASON_CONFIG = {
  /** 繁忙期開始（月-日） */
  startDate: '03-01',
  
  /** 繁忙期終了（月-日） */
  endDate: '04-10',
  
  /** 割増率（0.3 = 30%増し） */
  surchargeRate: 0.3,
  
  /** 表示ラベル */
  label: '繁忙期料金（3割増し）',
};

// ============================================
// 積み置き料金設定
// ============================================

export const STORAGE_FEE_CONFIG = {
  /** 1日あたりの積み置き料金（円） */
  perDayFee: 3000,
  
  /** 表示ラベル */
  label: '積み置き料金',
};

// ============================================
// 高速料金設定
// ============================================

export const HIGHWAY_FEE_CONFIG = {
  /** 県外移動時のみ高速料金を取得するか */
  onlyInterPrefecture: true,
  
  /** 取得不可時の表示テキスト */
  unavailableText: '取得不可（別途）',
  
  /** 取得不可時に0円として計算するか、別途扱いにするか */
  treatUnavailableAsZero: true,
};

// ============================================
// フォーム設定
// ============================================

export const FORM_CONFIG = {
  /** 階数の最小値 */
  minFloor: 1,
  
  /** 階数の最大値 */
  maxFloor: 50,
  
  /** デフォルト階数 */
  defaultFloor: 1,
};

// ============================================
// 繁忙期判定関数
// ============================================

/**
 * 指定された日付が繁忙期かどうかを判定
 */
export function isBusyPeriod(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const [startMonth, startDay] = BUSY_SEASON_CONFIG.startDate.split('-').map(Number);
  const [endMonth, endDay] = BUSY_SEASON_CONFIG.endDate.split('-').map(Number);
  
  // 月-日を数値化して比較
  const targetValue = month * 100 + day;
  const startValue = startMonth * 100 + startDay;
  const endValue = endMonth * 100 + endDay;
  
  return targetValue >= startValue && targetValue <= endValue;
}

// ============================================
// 距離プロバイダ設定
// ============================================

export const DISTANCE_PROVIDER_CONFIG = {
  /** 使用するプロバイダ */
  provider: 'google' as const,
  
  /** リトライ回数 */
  maxRetries: 3,
  
  /** タイムアウト（ミリ秒） */
  timeout: 10000,
};
