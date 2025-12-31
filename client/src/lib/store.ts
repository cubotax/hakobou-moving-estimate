/**
 * 引越し見積もりシステム 状態管理
 * 
 * MVPではSessionStorageを使用してステップ間のデータを保持します。
 * 将来的にはサーバーセッションやURLパラメータに移行可能な設計です。
 */

import type { Step1FormData, Step2FormData } from './schema';
import type { DistanceResult, EstimateResult } from './types';

const STORAGE_KEYS = {
  DATES: 'moving_estimate_dates',
  STEP1: 'moving_estimate_step1',
  STEP2: 'moving_estimate_step2',
  DISTANCE: 'moving_estimate_distance',
  RESULT: 'moving_estimate_result',
} as const;

// 日付データ型
export interface DateData {
  pickupDate: string;
  deliveryDate: string;
}

// ============================================
// ストレージユーティリティ
// ============================================

function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to get ${key} from storage:`, error);
    return null;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set ${key} to storage:`, error);
  }
}

function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from storage:`, error);
  }
}

// ============================================
// 日付データ（新Step1）
// ============================================

export function getDateData(): DateData | null {
  return getFromStorage<DateData>(STORAGE_KEYS.DATES);
}

export function setDateData(data: DateData): void {
  setToStorage(STORAGE_KEYS.DATES, data);
}

// 別名（DateSelectページから使用）
export const saveStep1DateData = setDateData;
export const getStep1DateData = getDateData;

// ============================================
// 住所データ（新Step2、元Step1）
// ============================================

export function getStep1Data(): Step1FormData | null {
  return getFromStorage<Step1FormData>(STORAGE_KEYS.STEP1);
}

export function setStep1Data(data: Step1FormData): void {
  setToStorage(STORAGE_KEYS.STEP1, data);
}

// ============================================
// Step2 データ
// ============================================

export function getStep2Data(): Step2FormData | null {
  return getFromStorage<Step2FormData>(STORAGE_KEYS.STEP2);
}

export function setStep2Data(data: Step2FormData): void {
  setToStorage(STORAGE_KEYS.STEP2, data);
}

// ============================================
// 距離データ
// ============================================

export function getDistanceData(): DistanceResult | null {
  return getFromStorage<DistanceResult>(STORAGE_KEYS.DISTANCE);
}

export function setDistanceData(data: DistanceResult): void {
  setToStorage(STORAGE_KEYS.DISTANCE, data);
}

// ============================================
// 見積もり結果
// ============================================

export function getEstimateResult(): EstimateResult | null {
  return getFromStorage<EstimateResult>(STORAGE_KEYS.RESULT);
}

export function setEstimateResult(data: EstimateResult): void {
  setToStorage(STORAGE_KEYS.RESULT, data);
}

// ============================================
// 全データクリア
// ============================================

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(removeFromStorage);
}

// ============================================
// 全データ取得（デバッグ用）
// ============================================

export function getAllData() {
  return {
    dates: getDateData(),
    step1: getStep1Data(),
    step2: getStep2Data(),
    distance: getDistanceData(),
    result: getEstimateResult(),
  };
}
