/**
 * 郵便番号から住所を取得するサービス
 * 
 * 郵便番号検索API（zipcloud）を使用
 * https://zipcloud.ibsnet.co.jp/doc/api
 */

export interface PostalAddress {
  prefecture: string;
  city: string;
  address: string;
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
      address: result.address3 || '',
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
