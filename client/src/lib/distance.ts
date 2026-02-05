/**
 * 距離計算サービス
 * 
 * MapFan API経由でバックエンドから距離を取得
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
// MapFan API プロバイダ（バックエンド経由）
// ============================================

/**
 * MapFan APIを使用した距離計算プロバイダ
 * バックエンドの /api/distance エンドポイントを呼び出す
 */
export class MapFanDistanceProvider implements DistanceProvider {
  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    try {
      // デバッグログ
      console.log('=== MapFan Distance Provider ===');
      console.log('Origin:', origin);
      console.log('Destination:', destination);
      console.log('Origin postalCode:', origin?.postalCode);
      console.log('Destination postalCode:', destination?.postalCode);

      const requestBody = {
        originPostalCode: origin?.postalCode || '',
        destinationPostalCode: destination?.postalCode || '',
      };

      console.log('Request body:', requestBody);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      console.error('MapFan distance calculation failed:', error);
      throw error;
    }
  }
}

// ============================================
// モックプロバイダ（開発/テスト用・フォールバック）
// ============================================

export class MockDistanceProvider implements DistanceProvider {
  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (origin?.postalCode === destination?.postalCode) {
      return {
        distanceKm: 0,
        highwayFee: null,
        isInterPrefecture: false,
      };
    }

    const isInterPrefecture = origin?.prefecture !== destination?.prefecture;
    const baseDistance = isInterPrefecture ? 300 : 50;
    const randomFactor = 0.8 + Math.random() * 0.4;
    const distanceKm = Math.round(baseDistance * randomFactor * 10) / 10;
    const highwayFee = isInterPrefecture ? Math.round(distanceKm * 25) : null;

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

export function getDistanceProvider(): DistanceProvider {
  if (currentProvider) {
    return currentProvider;
  }
  currentProvider = new MapFanDistanceProvider();
  console.log('Using MapFan distance provider');
  return currentProvider;
}

export function setDistanceProvider(provider: DistanceProvider): void {
  currentProvider = provider;
}

export function resetDistanceProvider(): void {
  currentProvider = null;
}
