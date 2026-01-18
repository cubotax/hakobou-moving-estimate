/**
 * 申込フォーム 型定義
 */

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
  floorPickup: number;
  hasElevatorPickup: boolean;
  floorDelivery: number;
  hasElevatorDelivery: boolean;
  needsPacking: boolean;
  plan?: string;
}

/** 申込フォームデータ */
export interface ApplyFormData {
  // 集荷先の詳細住所
  pickupAddressDetail: string; // 番地以降
  pickupBuilding: string;      // 建物名
  pickupRoom: string;          // 部屋番号

  // お届け先の詳細住所
  deliveryAddressDetail: string; // 番地以降
  deliveryBuilding: string;      // 建物名
  deliveryRoom: string;          // 部屋番号

  // 連絡先
  phone: string;
  email: string;

  // 希望日時
  preferredDateTime1: string;
  preferredDateTime2: string;
  preferredDateTime3: string;

  // 備考
  notes: string;
}

/** バリデーションエラー */
export interface FormErrors {
  pickupAddressDetail?: string;
  deliveryAddressDetail?: string;
  phone?: string;
  email?: string;
  preferredDateTime1?: string;
  contact?: string; // 電話 or メールどちらか必須エラー用
}

/** 申込フォーム初期値 */
export const initialFormData: ApplyFormData = {
  pickupAddressDetail: '',
  pickupBuilding: '',
  pickupRoom: '',
  deliveryAddressDetail: '',
  deliveryBuilding: '',
  deliveryRoom: '',
  phone: '',
  email: '',
  preferredDateTime1: '',
  preferredDateTime2: '',
  preferredDateTime3: '',
  notes: '',
};
