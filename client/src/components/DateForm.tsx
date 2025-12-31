/**
 * 日付入力フォームコンポーネント（Step0）
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { ArrowRight, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerField } from './DatePickerField';
import { step1Schema, type Step1FormData, defaultStep1Values } from '@/lib/schema';
import { setStep1Data, getStep1Data } from '@/lib/store';
import { isBusySeason, calculateStorageDays } from '@/lib/pricing';
import { BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG } from '@/lib/config';

export function DateForm() {
  const [, navigate] = useLocation();

  // 保存されたデータがあれば復元
  const savedData = getStep1Data();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: savedData || defaultStep1Values,
  });

  const pickupDate = watch('dates.pickupDate');
  const deliveryDate = watch('dates.deliveryDate');

  // 繁忙期チェック
  const isPickupBusySeason = isBusySeason(pickupDate);
  
  // 積み置き日数計算
  const storageDays = calculateStorageDays({ pickupDate, deliveryDate });

  const onSubmit = (data: Step1FormData) => {
    setStep1Data(data);
    navigate('/step1');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* 日付選択セクション */}
      <div className="pop-card p-6">
        <h3 className="text-xl font-black mb-6">引越し日程</h3>

        <div className="grid gap-6 max-w-md mx-auto">
          {/* 集荷日 */}
          <div className="space-y-2">
            <Label htmlFor="pickup-date" className="font-bold">
              集荷日 <span className="text-[oklch(0.75_0.2_0)]">*</span>
            </Label>
            <DatePickerField
              id="pickup-date"
              value={pickupDate}
              onChange={(value) => setValue('dates.pickupDate', value)}
              error={!!errors.dates?.pickupDate}
            />
            {errors.dates?.pickupDate && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {errors.dates.pickupDate.message}
              </p>
            )}
          </div>

          {/* お届け日 */}
          <div className="space-y-2">
            <Label htmlFor="delivery-date" className="font-bold">
              お届け日 <span className="text-[oklch(0.75_0.2_0)]">*</span>
            </Label>
            <DatePickerField
              id="delivery-date"
              value={deliveryDate}
              onChange={(value) => setValue('dates.deliveryDate', value)}
              error={!!errors.dates?.deliveryDate}
            />
            {errors.dates?.deliveryDate && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {errors.dates.deliveryDate.message}
              </p>
            )}
          </div>

          {/* 注意事項 */}
          <div className="space-y-3 mt-2">
            {/* 積み置き料金の但し書き */}
            {storageDays > 0 && (
              <div className="flex items-start gap-2 p-3 bg-[oklch(0.95_0.05_80)] rounded-xl border-2 border-[oklch(0.8_0.1_80)]">
                <AlertCircle className="w-5 h-5 text-[oklch(0.6_0.15_80)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[oklch(0.4_0.05_80)]">
                  <span className="font-bold">積み置き料金：</span>
                  集荷日とお届け日が異なる場合、1日あたり{STORAGE_FEE_CONFIG.perDayFee.toLocaleString()}円の積み置き料金が発生します。
                  <span className="font-bold">（{storageDays}日分）</span>
                </p>
              </div>
            )}

            {/* 繁忙期料金の但し書き */}
            {isPickupBusySeason && (
              <div className="flex items-start gap-2 p-3 bg-[oklch(0.95_0.1_20)] rounded-xl border-2 border-[oklch(0.8_0.15_20)]">
                <AlertCircle className="w-5 h-5 text-[oklch(0.6_0.2_20)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[oklch(0.4_0.1_20)]">
                  <span className="font-bold">繁忙期料金：</span>
                  {BUSY_SEASON_CONFIG.startDate.replace('-', '/')}〜{BUSY_SEASON_CONFIG.endDate.replace('-', '/')}は繁忙期のため、
                  基本料金が{Math.round(BUSY_SEASON_CONFIG.surchargeRate * 100)}%増しとなります。
                </p>
              </div>
            )}

            {/* 通常時の繁忙期案内 */}
            {!isPickupBusySeason && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500">
                  <span className="font-bold">繁忙期について：</span>
                  {BUSY_SEASON_CONFIG.startDate.replace('-', '/')}〜{BUSY_SEASON_CONFIG.endDate.replace('-', '/')}は繁忙期のため、
                  基本料金が{Math.round(BUSY_SEASON_CONFIG.surchargeRate * 100)}%増しとなります。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          className="pop-button max-w-[280px] h-14 text-lg"
        >
          住所を入力
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </form>
  );
}
