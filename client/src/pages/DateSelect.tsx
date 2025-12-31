/**
 * 日程選択ページ（Step1）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - ホイール型日付ピッカーで集荷日・お届け日を選択
 * - 繁忙期・積み置き料金の注意書き
 */

import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { WheelDatePicker } from '@/components/WheelDatePicker';
import { Button } from '@/components/ui/button';
import { saveStep1DateData } from '@/lib/store';
import { isBusyPeriod, PRICING_CONFIG, BUSY_SEASON_CONFIG } from '@/lib/config';
import { Calendar, Truck, AlertCircle, ArrowRight } from 'lucide-react';

export default function DateSelect() {
  const [, setLocation] = useLocation();
  const today = new Date();
  
  const [pickupDate, setPickupDate] = useState<Date>(today);
  const [deliveryDate, setDeliveryDate] = useState<Date>(today);
  const [error, setError] = useState<string>('');

  const handlePickupDateChange = useCallback((date: Date) => {
    setPickupDate(date);
    // お届け日が集荷日より前の場合は調整
    if (deliveryDate < date) {
      setDeliveryDate(date);
    }
    setError('');
  }, [deliveryDate]);

  const handleDeliveryDateChange = useCallback((date: Date) => {
    setDeliveryDate(date);
    setError('');
  }, []);

  const handleNext = () => {
    // バリデーション
    if (deliveryDate < pickupDate) {
      setError('お届け日は集荷日以降の日付を選択してください');
      return;
    }

    // 日付データを保存
    saveStep1DateData({
      pickupDate: pickupDate.toISOString().split('T')[0],
      deliveryDate: deliveryDate.toISOString().split('T')[0],
    });

    // 次のステップへ
    setLocation('/address');
  };

  // 積み置き日数を計算
  const storageDays = Math.max(0, Math.floor((deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // 繁忙期チェック
  const isPickupBusy = isBusyPeriod(pickupDate);
  const isDeliveryBusy = isBusyPeriod(deliveryDate);
  const isBusy = isPickupBusy || isDeliveryBusy;

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="bg-pink-400 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
              カンタン
            </span>
            <span className="bg-[oklch(0.92_0.16_95)] text-black text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
              4ステップ
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-black flex items-center justify-center gap-2">
            引越し見積もり
            <Truck className="w-8 h-8 text-[oklch(0.75_0.2_145)]" />
          </h1>
          <p className="mt-2 text-gray-600">
            まずは引越しの日程を選択してください！
          </p>
        </div>
      </header>

      {/* ステップインジケーター */}
      <StepIndicator steps={ESTIMATE_STEPS} currentStep={1} className="mb-6" />

      {/* メインコンテンツ */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* 日程選択カード */}
          <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[oklch(0.85_0.15_200)] rounded-full flex items-center justify-center border-2 border-black">
                <Calendar className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-xl font-black">引越し日程</h2>
              <span className="ml-auto bg-[oklch(0.85_0.15_200)] text-black text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                DATE
              </span>
            </div>

            {/* 集荷日 */}
            <div className="mb-6">
              <WheelDatePicker
                label="集荷日"
                value={pickupDate}
                onChange={handlePickupDateChange}
                minDate={today}
              />
            </div>

            {/* お届け日 */}
            <div className="mb-4">
              <WheelDatePicker
                label="お届け日"
                value={deliveryDate}
                onChange={handleDeliveryDateChange}
                minDate={pickupDate}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {/* 積み置き日数表示 */}
            {storageDays > 0 && (
              <div className="bg-orange-100 border-2 border-orange-400 rounded-xl p-4 mb-4">
                <p className="text-orange-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  積み置き期間: {storageDays}日間
                </p>
                <p className="text-orange-600 text-sm mt-1">
                  ※ 日をまたぐ配送の場合、1日あたり ¥{PRICING_CONFIG.storagePerDay.toLocaleString()} の積み置き料金が発生します
                </p>
              </div>
            )}

            {/* 繁忙期警告 */}
            {isBusy && (
              <div className="bg-pink-100 border-2 border-pink-400 rounded-xl p-4">
                <p className="text-pink-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  繁忙期料金について
                </p>
                <p className="text-pink-600 text-sm mt-1">
                  {BUSY_SEASON_CONFIG.startDate.replace('-', '/')}〜
                  {BUSY_SEASON_CONFIG.endDate.replace('-', '/')}は繁忙期のため、
                  基本料金が{BUSY_SEASON_CONFIG.surchargeRate * 100}%増しとなります。
                </p>
              </div>
            )}
          </div>

          {/* 次へボタン */}
          <Button
            onClick={handleNext}
            className="w-full h-14 text-lg font-black bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.16_95)] text-black border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            次へ進む
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* フッターメッセージ */}
          <p className="text-center text-gray-400 text-sm">
            ✨ 見積もりは無料です ✨
          </p>
        </div>
      </main>
    </div>
  );
}
