/**
 * 引越し見積もりシステム 型定義
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 拡張可能なデータ構造
 * - 明確な型安全性
 */

// ============================================
// 住所関連
// ============================================

/** 住所データ */
export interface Address {
  /** 都道府県 */
  prefecture: string;
  /** 市区町村 */
  city: string;
  /** 町名（オプション） */
  town?: string;
}

/** 住所バリデーション結果 */
export interface AddressValidationResult {
  /** バリデーション成功 */
  isValid: boolean;
  /** 正規化された住所 */
  normalizedAddress?: Address;
  /** エラーメッセージ */
  errorMessage?: string;
}

// ============================================
// 見積もりオプション
// ============================================

/** エレベーター有無 */
export type ElevatorStatus = 'yes' | 'no' | 'unknown';

/** 基本オプション */
export interface BaseOptions {
  /** 集荷先エレベーター有無 */
  hasElevatorPickup: boolean;
  /** 集荷先階数 */
  floorPickup: number;
  /** お届け先エレベーター有無 */
  hasElevatorDelivery: boolean;
  /** お届け先階数 */
  floorDelivery: number;
  /** 梱包必要 */
  needsPacking: boolean;
}

/** 拡張オプション（将来の追加項目用） */
export interface ExtendedOptions {
  /** ピアノ搬送 */
  hasPiano?: boolean;
  /** エアコン取り外し/取り付け */
  hasAircon?: boolean;
  /** 大型家具解体/組立 */
  hasFurnitureAssembly?: boolean;
}

/** 見積もりオプション全体 */
export type EstimateOptions = BaseOptions & ExtendedOptions;

// ============================================
// 見積もりデータ
// ============================================

/** Step1: 住所入力データ */
export interface Step1Data {
  pickupAddress: Address;
  deliveryAddress: Address;
}

/** Step2: 条件入力データ */
export interface Step2Data {
  options: EstimateOptions;
}

/** 距離計算結果 */
export interface DistanceResult {
  /** 走行距離（km） */
  distanceKm: number;
  /** 高速料金（円）- nullは取得不可 */
  highwayFee: number | null;
  /** 県外移動かどうか */
  isInterPrefecture: boolean;
}

/** 見積もりフォーム全体のデータ */
export interface MovingEstimateData {
  step1: Step1Data;
  step2: Step2Data;
  distance: DistanceResult | null;
}

// ============================================
// 見積もり結果
// ============================================

/** 料金内訳項目 */
export interface FeeBreakdownItem {
  /** 項目名 */
  name: string;
  /** 金額（円） */
  amount: number;
  /** 備考 */
  note?: string;
}

/** 見積もり結果 */
export interface EstimateResult {
  /** 走行距離（km） */
  distanceKm: number;
  /** 基本料金（円） */
  baseFee: number;
  /** オプション料金合計（円） */
  optionFee: number;
  /** 高速料金（円）- 取得不可の場合は0 */
  highwayFee: number;
  /** 合計見積金額（円） */
  totalFee: number;
  /** 料金内訳 */
  breakdown: FeeBreakdownItem[];
  /** 高速料金に関する注記 */
  highwayFeeNote?: string;
  /** 県外移動かどうか */
  isInterPrefecture: boolean;
}

// ============================================
// 料金設定
// ============================================

/** 基本料金モード */
export type BaseFeeMode = 'none' | 'per_km' | 'fixed';

/** オプション料金設定 */
export interface OptionFeeConfig {
  /** オプションID */
  id: string;
  /** 表示名 */
  label: string;
  /** 料金（円） */
  fee: number;
  /** 条件（例: 階数が2以上） */
  condition?: (options: EstimateOptions) => boolean;
}

/** 料金設定全体 */
export interface PricingConfig {
  /** 基本料金モード */
  baseFeeMode: BaseFeeMode;
  /** 固定基本料金（円） */
  fixedBaseFee: number;
  /** 距離単価（円/km） */
  perKmRate: number;
  /** オプション料金設定 */
  optionFees: OptionFeeConfig[];
}

// ============================================
// API関連
// ============================================

/** 距離計算APIリクエスト */
export interface DistanceApiRequest {
  origin: Address;
  destination: Address;
}

/** 距離計算APIレスポンス */
export interface DistanceApiResponse {
  success: boolean;
  data?: DistanceResult;
  error?: string;
}

/** 見積もり計算APIリクエスト */
export interface EstimateApiRequest {
  distance: DistanceResult;
  options: EstimateOptions;
}

/** 見積もり計算APIレスポンス */
export interface EstimateApiResponse {
  success: boolean;
  data?: EstimateResult;
  error?: string;
}

/** 郵便番号検索結果 */
export interface PostalCodeResult {
  /** 郵便番号 */
  postalCode: string;
  /** 都道府県 */
  prefecture: string;
  /** 市区町村 */
  city: string;
  /** 町名 */
  town: string;
}
