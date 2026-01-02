/**
 * 日付入力フォームコンポーネント（Step0）
 *
 * Design Philosophy: ポップ＆カジュアル
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { ArrowRight, AlertCircle, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerField } from './DatePickerField';
import { dateFormSchema, type DateFormData, type Step1FormData, defaultStep1Values } from '@/lib/schema';
import { setStep1Data, getStep1Data } from '@/lib/store';
import { isBusySeason, calculateStorageDays } from '@/lib/pricing';
import { BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG } from '@/lib/config';

const today = new Date().toISOString().split('T')[0];

/**
 * 表示制御フラグ
 * - 今は積み置き料金メッセージを非表示にしたいが、後で復活できるようにフラグで制御する
 *   true  => 表示
 *   false => 非表示（現在）
 */
const SHOW_STORAGE_FEE_MESSAGE = false;

export function DateForm() {
  const [, navigate] = useLocation();

  // ページ読み込み時にトップにスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 保存されたデータがあれば復元（dates フィールドのみ）
  const savedData = getStep1Data();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DateFormData>({
    resolver: zodResolver(dateFormSchema),
    defaultValues: {
      dates: {
        pickupDate: savedData?.dates?.pickupDate || today,
        deliveryDate: savedData?.dates?.deliveryDate || today,
      },
    },
  });

  const pickupDate = watch('dates.pickupDate');
  const deliveryDate = watch('dates.deliveryDate');

  // 繁忙期チェック（集荷日ベース）
  const isPickupBusySeason = isBusySeason(pickupDate);

  // 積み置き日数計算
  const storageDays = calculateStorageDays({ pickupDate, deliveryDate });

  const onSubmit = (data: DateFormData) => {
    // 既存の Step1 データを保持しながら日付を更新
    const existingData = getStep1Data() || defaultStep1Values;
    const updatedData: Step1FormData = {
      ...existingData,
      dates: data.dates,
    };
    setStep1Data(updatedData);
    navigate('/step1');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* 日付選択セクション */}
      <div className="pop-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[oklch(0.7_0.15_200)] flex items-center justify-center border-[2px] border-black">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-black">引越し日程</h3>
          </div>
          <span className="badge-green-no-border">DATE</span>
        </div>

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
            {/* 積み置き料金の但し書き（現在は非表示：フラグで復活可能） */}
            {SHOW_STORAGE_FEE_MESSAGE && storageDays > 0 && (
              <div className="flex items-start gap-2 p-3 bg-[oklch(0.95_0.05_80)] rounded-xl border-2 border-[oklch(0.8_0.1_80)]">
                <AlertCircle className="w-5 h-5 text-[oklch(0.6_0.15_80)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[oklch(0.4_0.05_80)]">
                  <span className="font-bold">積み置き料金：</span>
                  集荷日とお届け日が異なる場合、1日あたり{STORAGE_FEE_CONFIG.perDayFee.toLocaleString()}円の積み置き料金が発生します。
                  <span className="font-bold">（{storageDays}日分）</span>
                </p>
              </div>
            )}

            {/* 繁忙期料金の但し書き（繁忙期のときだけ表示） */}
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

            {/*
              通常時の繁忙期案内（常時表示）は仕様により非表示に変更
              - 仕様：引越し日程が 3/1〜4/10 に重なったときだけ繁忙期コメントを表示する
              - 復活したい場合は、ここに「!isPickupBusySeason」ブロックを戻す
            */}
          </div>
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-center pt-4">
        <Button type="submit" className="pop-button max-w-[280px] h-14 text-lg">
          次へ進む
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </form>
  );
}