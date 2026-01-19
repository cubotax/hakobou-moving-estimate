/**
 * 集荷対応エリアの定義と判定ロジック
 * 
 * 2026/01/19 新規作成
 * 将来的にエリアを追加・変更する場合は ALLOWED_AREAS を編集してください
 */

/**
 * 集荷対応エリアリスト
 * 都道府県ごとに対応している市区町村を定義
 */
export const ALLOWED_AREAS: Record<string, string[]> = {
    '青森県': [
        '青森市',
        '弘前市',
        '黒石市',
        '五所川原市',
        'つがる市',
        '平川市',
        '東津軽郡平内町',
        '東津軽郡今別町',
        '東津軽郡蓬田村',
        '東津軽郡外ヶ浜町',
        '西津軽郡鰺ヶ沢町',
        '中津軽郡西目屋村',
        '南津軽郡藤崎町',
        '南津軽郡大鰐町',
        '南津軽郡田舎館村',
        '北津軽郡板柳町',
        '北津軽郡鶴田町',
        '北津軽郡中泊町',
    ],
    '秋田県': [
        '大館市',
    ],
};

/**
 * エリア外エラーメッセージ
 * ※リンク部分はReactコンポーネント側で処理
 */
export const OUT_OF_AREA_ERROR_MESSAGE =
    'ご入力いただいた地域は集荷対応エリア外となっております。';

/**
 * エリア外エラータイプを識別するための定数
 */
export const OUT_OF_AREA_ERROR_TYPE = 'OUT_OF_AREA' as const;

/**
 * 町域が特定できないエラーメッセージ
 */
export const NO_TOWN_ERROR_MESSAGE =
    'この郵便番号では距離を取得できません。\n' +
    '町名まで特定できる郵便番号を入力してください。\n' +
    '（例：036-8061）';

/**
 * 集荷対応エリアかどうかを判定する
 * @param prefecture 都道府県名（例: 青森県）
 * @param city 市区町村名（例: 青森市）
 * @returns 集荷対応エリア内であれば true
 */
export function isPickupAllowedArea(prefecture: string, city: string): boolean {
    const allowedCities = ALLOWED_AREAS[prefecture];

    // 対応都道府県でない場合
    if (!allowedCities) {
        return false;
    }

    // 市区町村名が対応リストに含まれているかチェック
    // address2 が対応エリアの市区町村名を「含む」または「含まれる」で判定
    // 例: "東津軽郡平内町" が city に含まれる、または city が "東津軽郡平内町" を含む
    return allowedCities.some(allowedCity =>
        city.includes(allowedCity) || allowedCity.includes(city)
    );
}

/**
 * 住所バリデーション結果の型
 */
export interface PickupAreaValidationResult {
    isValid: boolean;
    errorType?: 'NO_TOWN' | 'OUT_OF_AREA';
    errorMessage?: string;
}

/**
 * 集荷先住所のバリデーション
 * @param address1 都道府県名
 * @param address2 市区町村名
 * @param address3 町域名
 * @returns バリデーション結果
 */
export function validatePickupAddress(
    address1: string,
    address2: string,
    address3: string | null | undefined
): PickupAreaValidationResult {
    // 1. 町域（address3）が取得できない場合はエラー
    if (!address3 || address3.trim() === '') {
        return {
            isValid: false,
            errorType: 'NO_TOWN',
            errorMessage: NO_TOWN_ERROR_MESSAGE,
        };
    }

    // 2. エリア判定
    if (!isPickupAllowedArea(address1, address2)) {
        return {
            isValid: false,
            errorType: 'OUT_OF_AREA',
            errorMessage: OUT_OF_AREA_ERROR_MESSAGE,
        };
    }

    // 3. すべてOK
    return { isValid: true };
}
