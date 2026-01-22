/**
 * 申込フォーム 型定義
 */

/** 希望時間帯 */
export type TimeSlot = 'morning' | 'afternoon' | 'anytime' | '';

/** 見積サマリー（API取得データ） */
export interface EstimateSummary {
  id: string;
  pickupPrefecture: string;
  pickupCity: string;
  pickupTown: string;
  deliveryPrefecture: string;
  deliveryCity: string;
  deliveryTown: string;
  pickupDate: string;
  deliveryDate: string;
  totalFee: number;
  distanceKm: number;
  floorPickup: number;
  hasElevatorPickup: boolean;
  floorDelivery: number;
  hasElevatorDelivery: boolean;
  needsPacking: boolean;
  plan?: string;
}

/** 申込フォームデータ */
export interface ApplyFormData {
  // お名前
  lastName: string;        // 姓
  firstName: string;       // 名
  lastNameKana: string;    // せい（ふりがな）
  firstNameKana: string;   // めい（ふりがな）

  // 集荷先の詳細住所
  pickupAddressDetail: string; // 番地以降
  pickupBuilding: string;      // 建物名・部屋番号（統合）

  // お届け先の詳細住所
  deliveryAddressDetail: string; // 番地以降
  deliveryBuilding: string;      // 建物名・部屋番号（統合）

  // 連絡先
  phone: string;

  // 備考
  notes: string;
}

/** バリデーションエラー */
export interface FormErrors {
  lastName?: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
  pickupAddressDetail?: string;
  deliveryAddressDetail?: string;
  phone?: string;
}

/** 申込フォーム初期値 */
export const initialFormData: ApplyFormData = {
  lastName: '',
  firstName: '',
  lastNameKana: '',
  firstNameKana: '',
  pickupAddressDetail: '',
  pickupBuilding: '',
  deliveryAddressDetail: '',
  deliveryBuilding: '',
  phone: '',
  notes: '',
};

// 時間帯のラベルはschema.tsからインポートして使用してください
