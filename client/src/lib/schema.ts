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
    .min(1, '市町村を入力してください')
    .max(100, '市町村名が長すぎます'),
});

// ============================================
// Step1: 住所入力スキーマ
// ============================================

export const step1Schema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
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
    .min(FORM_CONFIG.minFloor, `${FORM_CONFIG.minFloor}階以上を入力してください`)
    .max(FORM_CONFIG.maxFloor, `${FORM_CONFIG.maxFloor}階以下を入力してください`),
  needsPacking: z.boolean(),
});

export type Step2FormData = z.infer<typeof step2Schema>;

// ============================================
// デフォルト値
// ============================================

export const defaultStep1Values: Step1FormData = {
  pickupAddress: {
    prefecture: '',
    city: '',
  },
  deliveryAddress: {
    prefecture: '',
    city: '',
  },
};

export const defaultStep2Values: Step2FormData = {
  hasElevatorPickup: false,
  floorPickup: FORM_CONFIG.defaultFloor,
  hasElevatorDelivery: false,
  floorDelivery: FORM_CONFIG.defaultFloor,
  needsPacking: false,
};
