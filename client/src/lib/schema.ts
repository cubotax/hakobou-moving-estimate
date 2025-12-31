/**
 * 引越し見積もりシステム Zodバリデーションスキーマ
 */

import { z } from 'zod';
import { PREFECTURES, FORM_CONFIG } from './config';

// ============================================
// 住所スキーマ
// ============================================

export const addressSchema = z.object({
  prefecture: z
    .string()
    .min(1, '都道府県を選択してください')
    .refine(
      (val) => PREFECTURES.includes(val as any),
      '有効な都道府県を選択してください'
    ),
  city: z
    .string()
    .min(1, '市区町村を入力してください')
    .max(100, '市区町村名が長すぎます'),
  town: z
    .string()
    .min(1, '町名を入力してください')
    .max(100, '町名が長すぎます'),
});

// ============================================
// 日付スキーマ
// ============================================

export const movingDatesSchema = z.object({
  pickupDate: z
    .string()
    .min(1, '集荷日を選択してください'),
  deliveryDate: z
    .string()
    .min(1, 'お届け日を選択してください'),
}).refine(
  (data) => {
    if (!data.pickupDate || !data.deliveryDate) return true;
    return new Date(data.deliveryDate) >= new Date(data.pickupDate);
  },
  {
    message: 'お届け日は集荷日以降の日付を選択してください',
    path: ['deliveryDate'],
  }
);

// ============================================
// Step0: 日付入力スキーマ（DateForm用）
// ============================================

export const dateFormSchema = z.object({
  dates: movingDatesSchema,
});

export type DateFormData = z.infer<typeof dateFormSchema>;

// ============================================
// Step1: 住所入力スキーマ
// ============================================

export const step1Schema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  dates: movingDatesSchema,
});

export type Step1FormData = z.infer<typeof step1Schema>;

// ============================================
// Step2: 条件入力スキーマ
// ============================================

export const step2Schema = z.object({
  hasElevatorPickup: z.boolean(),
  floorPickup: z
    .number()
    .min(FORM_CONFIG.minFloor, `${FORM_CONFIG.minFloor}階以上を入力してください`)
    .max(FORM_CONFIG.maxFloor, `${FORM_CONFIG.maxFloor}階以下を入力してください`),
  hasElevatorDelivery: z.boolean(),
  floorDelivery: z
    .number()
    .min(FORM_CONFIG.minFloor, `${FORM_CONFIG.minFloor}階以下を入力してください`)
    .max(FORM_CONFIG.maxFloor, `${FORM_CONFIG.maxFloor}階以下を入力してください`),
  needsPacking: z.boolean(),
});

export type Step2FormData = z.infer<typeof step2Schema>;

// ============================================
// デフォルト値
// ============================================

// 今日の日付をYYYY-MM-DD形式で取得
const today = new Date().toISOString().split('T')[0];

export const defaultStep1Values: Step1FormData = {
  pickupAddress: {
    prefecture: '',
    city: '',
    town: '',
  },
  deliveryAddress: {
    prefecture: '',
    city: '',
    town: '',
  },
  dates: {
    pickupDate: today,
    deliveryDate: today,
  },
};

export const defaultStep2Values: Step2FormData = {
  hasElevatorPickup: false,
  floorPickup: FORM_CONFIG.defaultFloor,
  hasElevatorDelivery: false,
  floorDelivery: FORM_CONFIG.defaultFloor,
  needsPacking: false,
};
