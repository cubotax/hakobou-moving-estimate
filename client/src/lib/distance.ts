/**
 * 距離計算サービス
 * 
 * プロバイダ差し替え可能な設計
 * - Google Maps Routes API（デフォルト）
 * - 将来的にNAVITIME APIなどに差し替え可能
 */

import type { Address, DistanceResult } from './types';

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
// Google Maps プロバイダ
// ============================================

/**
 * Google Maps APIを使用した距離計算プロバイダ
 * 
 * Manusプロキシを通じてGoogle Maps APIにアクセスします。
 * APIキーは自動的に処理されます。
 */
export class GoogleMapsDistanceProvider implements DistanceProvider {
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;

  constructor() {
    // Google Maps APIが読み込まれている場合に初期化
    if (typeof google !== 'undefined' && google.maps) {
      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
    }
  }

  /**
   * 住所を座標に変換
   */
  private async geocodeAddress(address: Address): Promise<google.maps.LatLng> {
    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    const fullAddress = `${address.prefecture}${address.city}`;
    
    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        { address: fullAddress, region: 'jp' },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });
  }

  /**
   * 2地点間のルートを取得
   */
  private async getRoute(
    origin: google.maps.LatLng,
    destination: google.maps.LatLng
  ): Promise<google.maps.DirectionsResult> {
    if (!this.directionsService) {
      throw new Error('DirectionsService not initialized');
    }

    return new Promise((resolve, reject) => {
      this.directionsService!.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        }
      );
    });
  }

  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    try {
      // 住所を座標に変換
      const [originLatLng, destLatLng] = await Promise.all([
        this.geocodeAddress(origin),
        this.geocodeAddress(destination),
      ]);

      // ルートを取得
      const result = await this.getRoute(originLatLng, destLatLng);
      
      // 距離を取得（メートル→キロメートル）
      const leg = result.routes[0]?.legs[0];
      if (!leg || !leg.distance) {
        throw new Error('Distance not found in response');
      }

      const distanceKm = leg.distance.value / 1000;
      const isInterPrefecture = origin.prefecture !== destination.prefecture;

      // 高速料金は Google Directions API では直接取得できないため、
      // Routes API を使用するか、null を返す
      // MVPでは null を返し、UIで「取得不可」と表示
      return {
        distanceKm,
        highwayFee: null, // Routes API での実装が必要
        isInterPrefecture,
      };
    } catch (error) {
      console.error('Distance calculation failed:', error);
      throw error;
    }
  }
}

// ============================================
// モックプロバイダ（開発/テスト用）
// ============================================

/**
 * モックの距離計算プロバイダ
 * 開発時やAPIが利用できない場合に使用
 */
export class MockDistanceProvider implements DistanceProvider {
  async getDistance(origin: Address, destination: Address): Promise<DistanceResult> {
    // シミュレーション用の遅延
    await new Promise(resolve => setTimeout(resolve, 500));

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
 * 
 * Google Maps APIが利用可能な場合はGoogleMapsDistanceProviderを、
 * そうでない場合はMockDistanceProviderを返します。
 */
export function getDistanceProvider(): DistanceProvider {
  if (currentProvider) {
    return currentProvider;
  }

  // Google Maps APIが利用可能かチェック
  if (typeof google !== 'undefined' && google.maps) {
    currentProvider = new GoogleMapsDistanceProvider();
  } else {
    console.warn('Google Maps API not available, using mock provider');
    currentProvider = new MockDistanceProvider();
  }

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
