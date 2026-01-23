/**
 * 距離計算サービス
 * 
 * NAVITIME API経由でバックエンドから距離を取得
 */

import type { Address, DistanceResult } from './types';
import { API_CONFIG } from './config';

// ============================================
// プロバイダインターフェース
// ============================================

export interface DistanceProvider {
  /**
   * 2地点間の距離と高速料金を取得
   */
  getDistance(origin: Address, destination: Address): Promise<DistanceResult>;
}

// ============================================
// NAVITIME API プロバイダ（バックエンド経由）
// ============================================

/**
 * NAVITIME APIを使用した距離計算プロバイダ
 * バックエンドの /api/distance エンドポイントを呼び出す
 */
export class NavitimeDistanceProvider implements DistanceProvider {
  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    try {
      // 郵便番号を使ってバックエンドAPIを呼び出す
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originPostalCode: origin.postalCode,
          destinationPostalCode: destination.postalCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '距離の取得に失敗しました');
      }

      return {
        distanceKm: data.distanceKm,
        highwayFee: data.highwayFee,
        isInterPrefecture: data.isInterPrefecture,
      };
    } catch (error) {
      console.error('NAVITIME distance calculation failed:', error);
      throw error;
    }
  }
}

// ============================================
// モックプロバイダ（開発/テスト用・フォールバック）
// ============================================

/**
 * モックの距離計算プロバイダ
 * APIが利用できない場合のフォールバック
 */
export class MockDistanceProvider implements DistanceProvider {
  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    // シミュレーション用の遅延
    await new Promise(resolve => setTimeout(resolve, 500));

    // 同じ住所の場合は0kmを返す
    if (origin.postalCode === destination.postalCode) {
      return {
        distanceKm: 0,
        highwayFee: null,
        isInterPrefecture: false,
      };
    }

    const isInterPrefecture = origin.prefecture !== destination.prefecture;

    // 県外の場合は長距離、県内の場合は短距離をシミュレート
    const baseDistance = isInterPrefecture ? 300 : 50;
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
    const distanceKm = Math.round(baseDistance * randomFactor * 10) / 10;

    // 県外の場合のみ高速料金をシミュレート
    const highwayFee = isInterPrefecture
      ? Math.round(distanceKm * 25) // 約25円/km
      : null;

    return {
      distanceKm,
      highwayFee,
      isInterPrefecture,
    };
  }
}

// ============================================
// プロバイダファクトリ
// ============================================

let currentProvider: DistanceProvider | null = null;

/**
 * 距離計算プロバイダを取得
 * NAVITIME APIプロバイダを返す
 */
export function getDistanceProvider(): DistanceProvider {
  if (currentProvider) {
    return currentProvider;
  }

  // NAVITIME APIプロバイダを使用
  currentProvider = new NavitimeDistanceProvider();
  console.log('Using NAVITIME distance provider');

  return currentProvider;
}

/**
 * プロバイダを設定（テスト用）
 */
export function setDistanceProvider(provider: DistanceProvider): void {
  currentProvider = provider;
}

/**
 * プロバイダをリセット
 */
export function resetDistanceProvider(): void {
  currentProvider = null;
}
