/**
 * 条件入力ページ（Step3）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 黒枠のカード
 * - カラフルなバッジ
 * - 親しみやすいチェックボックス
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Building2, 
  Package, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  Truck,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { step2Schema, type Step2FormData, defaultStep2Values } from '@/lib/schema';
import { 
  setStep2Data, 
  getStep2Data, 
  getDistanceData,
  getStep1Data,
  getDateData,
  setEstimateResult 
} from '@/lib/store';
import { calculateEstimate } from '@/lib/pricing';
import type { EstimateOptions, MovingDates } from '@/lib/types';

// 階数の選択肢（1階〜20階）
const FLOOR_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function ConditionInput() {
  const [, navigate] = useLocation();

  // 距離データがなければ住所入力ページに戻す
  useEffect(() => {
    const distanceData = getDistanceData();
    const dateData = getDateData();
    
    if (!dateData) {
      toast.error('まず日程を選択してください');
      navigate('/');
      return;
    }
    
    if (!distanceData) {
      toast.error('まず住所を入力してください');
      navigate('/address');
    }
  }, [navigate]);

  // 保存されたデータがあれば復元
  const savedData = getStep2Data();

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: savedData || defaultStep2Values,
  });

  const hasElevatorPickup = watch('hasElevatorPickup');
  const hasElevatorDelivery = watch('hasElevatorDelivery');
  const floorPickup = watch('floorPickup');
  const floorDelivery = watch('floorDelivery');

  const onSubmit = (data: Step2FormData) => {
    // データを保存
    setStep2Data(data);

    // 見積もりを計算
    const distanceData = getDistanceData();
    const step1Data = getStep1Data();
    const dateData = getDateData();
    
    if (distanceData) {
      const options: EstimateOptions = {
        hasElevatorPickup: data.hasElevatorPickup,
        floorPickup: data.floorPickup,
        hasElevatorDelivery: data.hasElevatorDelivery,
        floorDelivery: data.floorDelivery,
        needsPacking: data.needsPacking,
      };
      
      // 日付データを取得（新しいストレージから優先）
      const dates: MovingDates | undefined = dateData ? {
        pickupDate: dateData.pickupDate,
        deliveryDate: dateData.deliveryDate,
      } : step1Data?.dates ? {
        pickupDate: step1Data.dates.pickupDate,
        deliveryDate: step1Data.dates.deliveryDate,
      } : undefined;
      
      const result = calculateEstimate(distanceData, options, dates);
      setEstimateResult(result);
    }

    // 結果ページへ
    navigate('/result');
  };

  const goBack = () => {
    navigate('/address');
  };

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
            条件を入力してください！
          </p>
        </div>
      </header>

      {/* ステップインジケーター */}
      <StepIndicator steps={ESTIMATE_STEPS} currentStep={3} className="mb-6" />

      {/* メインコンテンツ */}
      <main className="px-4 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto space-y-6">
          {/* 集荷先の条件 */}
          <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-400 flex items-center justify-center border-2 border-black">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">集荷先の条件</h3>
              <span className="ml-auto bg-pink-400 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                FROM
              </span>
            </div>
            
            <div className="space-y-6 max-w-md mx-auto">
              {/* 階数 */}
              <div className="space-y-2">
                <Label htmlFor="floor-pickup" className="flex items-center gap-2 font-bold">
                  <Building2 className="w-5 h-5" />
                  階数
                </Label>
                <Controller
                  name="floorPickup"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger 
                          id="floor-pickup"
                          className={`w-28 border-2 border-black rounded-xl h-12 text-center text-lg font-bold bg-white ${
                            errors.floorPickup ? 'border-pink-500' : ''
                          }`}
                        >
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-black rounded-xl">
                          {FLOOR_OPTIONS.map((floor) => (
                            <SelectItem 
                              key={floor} 
                              value={String(floor)}
                              className="text-lg font-medium"
                            >
                              {floor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-medium">階</span>
                    </div>
                  )}
                />
                {errors.floorPickup && (
                  <p className="text-sm text-pink-500 font-medium">{errors.floorPickup.message}</p>
                )}
                {floorPickup >= 2 && !hasElevatorPickup && (
                  <p className="text-sm text-orange-500 font-medium flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                    階段作業の追加料金が発生します
                  </p>
                )}
              </div>

              {/* エレベーター */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold">
                  エレベーター
                </Label>
                <Controller
                  name="hasElevatorPickup"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-3 pt-2">
                      <Checkbox
                        id="elevator-pickup"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-6 h-6 border-2 border-black rounded-md data-[state=checked]:bg-[oklch(0.75_0.2_145)] data-[state=checked]:border-[oklch(0.75_0.2_145)]"
                      />
                      <Label 
                        htmlFor="elevator-pickup" 
                        className="text-base font-medium cursor-pointer"
                      >
                        エレベーターあり
                      </Label>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* お届け先の条件 */}
          <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_145)] flex items-center justify-center border-2 border-black">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">お届け先の条件</h3>
              <span className="ml-auto bg-[oklch(0.75_0.2_145)] text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                TO
              </span>
            </div>
            
            <div className="space-y-6 max-w-md mx-auto">
              {/* 階数 */}
              <div className="space-y-2">
                <Label htmlFor="floor-delivery" className="flex items-center gap-2 font-bold">
                  <Building2 className="w-5 h-5" />
                  階数
                </Label>
                <Controller
                  name="floorDelivery"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger 
                          id="floor-delivery"
                          className={`w-28 border-2 border-black rounded-xl h-12 text-center text-lg font-bold bg-white ${
                            errors.floorDelivery ? 'border-pink-500' : ''
                          }`}
                        >
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-black rounded-xl">
                          {FLOOR_OPTIONS.map((floor) => (
                            <SelectItem 
                              key={floor} 
                              value={String(floor)}
                              className="text-lg font-medium"
                            >
                              {floor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-medium">階</span>
                    </div>
                  )}
                />
                {errors.floorDelivery && (
                  <p className="text-sm text-pink-500 font-medium">{errors.floorDelivery.message}</p>
                )}
                {floorDelivery >= 2 && !hasElevatorDelivery && (
                  <p className="text-sm text-orange-500 font-medium flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                    階段作業の追加料金が発生します
                  </p>
                )}
              </div>

              {/* エレベーター */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold">
                  エレベーター
                </Label>
                <Controller
                  name="hasElevatorDelivery"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-3 pt-2">
                      <Checkbox
                        id="elevator-delivery"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-6 h-6 border-2 border-black rounded-md data-[state=checked]:bg-[oklch(0.75_0.2_145)] data-[state=checked]:border-[oklch(0.75_0.2_145)]"
                      />
                      <Label 
                        htmlFor="elevator-delivery" 
                        className="text-base font-medium cursor-pointer"
                      >
                        エレベーターあり
                      </Label>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* その他のオプション */}
          <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center border-2 border-black">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">その他のオプション</h3>
              <span className="ml-auto bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                OPTION
              </span>
            </div>
            
            <div className="max-w-md mx-auto">
              <Controller
                name="needsPacking"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-[oklch(0.92_0.16_95)] transition-colors">
                    <Checkbox
                      id="needs-packing"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="w-6 h-6 mt-0.5 border-2 border-black rounded-md data-[state=checked]:bg-[oklch(0.92_0.16_95)] data-[state=checked]:border-black"
                    />
                    <div>
                      <Label 
                        htmlFor="needs-packing" 
                        className="text-base font-bold cursor-pointer flex items-center gap-2"
                      >
                        <Sparkles className="w-5 h-5 text-orange-400" />
                        梱包サービスを利用する
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        荷物の梱包作業をスタッフが行います
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={goBack}
              className="flex-1 h-14 text-lg font-black bg-gray-200 hover:bg-gray-300 text-black border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              戻る
            </Button>
            <Button
              type="submit"
              className="flex-1 h-14 text-lg font-black bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.16_95)] text-black border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              見積もりを確認
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* フッターメッセージ */}
          <p className="text-center text-gray-400 text-sm">
            ✨ 見積もりは無料です ✨
          </p>
        </form>
      </main>
    </div>
  );
}
