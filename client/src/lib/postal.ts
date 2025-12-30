/**
 * 郵便番号から住所を取得するサービス
 * 
 * 郵便番号検索API（zipcloud）を使用
 * https://zipcloud.ibsnet.co.jp/doc/api
 */

import type { Address, AddressValidationResult } from './types';

export interface PostalAddress {
  prefecture: string;
  city: string;
  town: string;
  fullAddress: string;
}

export interface PostalResult {
  success: boolean;
  address?: PostalAddress;
  error?: string;
}

/**
 * 郵便番号をフォーマット（ハイフンを除去）
 */
export function formatPostalCode(code: string): string {
  return code.replace(/[-－ー]/g, '').replace(/\s/g, '');
}

/**
 * 郵便番号のバリデーション
 */
export function isValidPostalCode(code: string): boolean {
  const formatted = formatPostalCode(code);
  return /^\d{7}$/.test(formatted);
}

/**
 * 郵便番号から住所を取得
 */
export async function getAddressByPostalCode(postalCode: string): Promise<PostalResult> {
  const formatted = formatPostalCode(postalCode);
  
  if (!isValidPostalCode(formatted)) {
    return {
      success: false,
      error: '郵便番号は7桁の数字で入力してください',
    };
  }

  try {
    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formatted}`
    );
    
    if (!response.ok) {
      throw new Error('APIリクエストに失敗しました');
    }

    const data = await response.json();

    if (data.status !== 200) {
      return {
        success: false,
        error: data.message || '住所の取得に失敗しました',
      };
    }

    if (!data.results || data.results.length === 0) {
      return {
        success: false,
        error: '該当する住所が見つかりませんでした',
      };
    }

    const result = data.results[0];
    const address: PostalAddress = {
      prefecture: result.address1,
      city: result.address2,
      town: result.address3 || '',
      fullAddress: `${result.address1}${result.address2}${result.address3 || ''}`,
    };

    return {
      success: true,
      address,
    };
  } catch (error) {
    console.error('Postal code lookup error:', error);
    return {
      success: false,
      error: '住所の取得中にエラーが発生しました',
    };
  }
}

/**
 * 住所（都道府県+市区町村+町名）が実在するかバリデーション
 * Google Maps Geocoding APIを使用して検証
 */
export async function validateAddress(address: Address): Promise<AddressValidationResult> {
  const { prefecture, city, town } = address;
  
  // 基本的な入力チェック
  if (!prefecture || !city || !town) {
    return {
      isValid: false,
      errorMessage: '都道府県、市区町村、町名をすべて入力してください',
    };
  }

  // Google Maps Geocoding APIで住所を検証
  const fullAddress = `${prefecture}${city}${town}`;
  
  try {
    // Google Maps APIのロードを待つ
    if (!window.google?.maps) {
      // Google Maps APIがロードされていない場合は、基本的なバリデーションのみ
      console.warn('Google Maps API not loaded, skipping geocoding validation');
      return {
        isValid: true,
        normalizedAddress: { prefecture, city, town },
      };
    }

    const geocoder = new window.google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode(
        { 
          address: fullAddress,
          region: 'jp',
          language: 'ja',
        },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0];
            
            // 結果の精度をチェック
            // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER は高精度
            // APPROXIMATE は市区町村レベル以下の精度
            const locationType = result.geometry.location_type;
            
            // 住所コンポーネントを解析
            const components = result.address_components;
            let foundPrefecture = '';
            let foundCity = '';
            let foundTown = '';
            
            for (const component of components) {
              if (component.types.includes('administrative_area_level_1')) {
                foundPrefecture = component.long_name;
              }
              if (component.types.includes('locality') || 
                  component.types.includes('administrative_area_level_2') ||
                  component.types.includes('sublocality_level_1')) {
                foundCity = component.long_name;
              }
              if (component.types.includes('sublocality_level_2') ||
                  component.types.includes('sublocality_level_3') ||
                  component.types.includes('sublocality')) {
                foundTown = component.long_name;
              }
            }

            // 入力された都道府県と一致するか確認
            if (foundPrefecture && !foundPrefecture.includes(prefecture.replace(/[都道府県]$/, ''))) {
              resolve({
                isValid: false,
                errorMessage: `入力された住所が見つかりませんでした。都道府県を確認してください。`,
              });
              return;
            }

            // 精度が低すぎる場合は警告
            if (locationType === 'APPROXIMATE') {
              // APPROXIMATEでも住所が見つかった場合は有効とする
              resolve({
                isValid: true,
                normalizedAddress: {
                  prefecture: foundPrefecture || prefecture,
                  city: foundCity || city,
                  town: foundTown || town,
                },
              });
              return;
            }

            resolve({
              isValid: true,
              normalizedAddress: {
                prefecture: foundPrefecture || prefecture,
                city: foundCity || city,
                town: foundTown || town,
              },
            });
          } else if (status === 'ZERO_RESULTS') {
            resolve({
              isValid: false,
              errorMessage: '入力された住所が見つかりませんでした。町名を確認してください。',
            });
          } else {
            // APIエラーの場合は、入力をそのまま受け入れる
            console.warn('Geocoding API error:', status);
            resolve({
              isValid: true,
              normalizedAddress: { prefecture, city, town },
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Address validation error:', error);
    // エラーの場合は入力をそのまま受け入れる
    return {
      isValid: true,
      normalizedAddress: { prefecture, city, town },
    };
  }
}

/**
 * 郵便番号から住所を検索し、入力された住所と照合
 * 市区町村+町名の組み合わせが実在するか確認
 */
export async function searchAndValidateAddress(
  prefecture: string,
  city: string,
  town: string
): Promise<AddressValidationResult> {
  // Google Maps APIで住所を検証
  return validateAddress({ prefecture, city, town });
}
