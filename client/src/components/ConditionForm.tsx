/**
 * 条件入力フォームコンポーネント（Step2）
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
import { step2Schema, type Step2FormData, defaultStep2Values } from '@/lib/schema';
import { 
  setStep2Data, 
  getStep2Data, 
  getDistanceData,
  getStep1Data,
  setEstimateResult 
} from '@/lib/store';
import { calculateEstimate } from '@/lib/pricing';
import type { EstimateOptions, MovingDates } from '@/lib/types';

// 階数の選択肢（1階〜20階）
const FLOOR_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export function ConditionForm() {
  const [, navigate] = useLocation();

  // ページ読み込み時にトップにスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 距離データがなければStep1に戻す
  useEffect(() => {
    const distanceData = getDistanceData();
    if (!distanceData) {
      navigate('/');
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
    
    if (distanceData) {
      const options: EstimateOptions = {
        hasElevatorPickup: data.hasElevatorPickup,
        floorPickup: data.floorPickup,
        hasElevatorDelivery: data.hasElevatorDelivery,
        floorDelivery: data.floorDelivery,
        needsPacking: data.needsPacking,
      };
      
      // 日付データを取得
      const dates: MovingDates | undefined = step1Data?.dates ? {
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
    navigate('/step1');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* 集荷先の条件 */}
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_0)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">集荷先の条件</h3>
          <span className="badge-pink-no-border ml-auto">FROM</span>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
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
                      className={`w-28 border-[2px] border-black rounded-xl h-12 text-center text-lg font-bold bg-white ${
                        errors.floorPickup ? 'border-[oklch(0.75_0.2_0)]' : ''
                      }`}
                    >
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent className="border-[2px] border-black rounded-xl">
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
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">{errors.floorPickup.message}</p>
            )}
            {floorPickup >= 2 && !hasElevatorPickup && (
              <p className="text-sm text-[oklch(0.8_0.18_60)] font-medium flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[oklch(0.8_0.18_60)]"></span>
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
                    className="w-6 h-6 border-[2px] border-black rounded-md data-[state=checked]:bg-[oklch(0.75_0.2_145)] data-[state=checked]:border-[oklch(0.75_0.2_145)]"
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
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_145)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">お届け先の条件</h3>
          <span className="badge-green ml-auto">TO</span>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
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
                      className={`w-28 border-[2px] border-black rounded-xl h-12 text-center text-lg font-bold bg-white ${
                        errors.floorDelivery ? 'border-[oklch(0.75_0.2_0)]' : ''
                      }`}
                    >
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent className="border-[2px] border-black rounded-xl">
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
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">{errors.floorDelivery.message}</p>
            )}
            {floorDelivery >= 2 && !hasElevatorDelivery && (
              <p className="text-sm text-[oklch(0.8_0.18_60)] font-medium flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[oklch(0.8_0.18_60)]"></span>
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
                    className="w-6 h-6 border-[2px] border-black rounded-md data-[state=checked]:bg-[oklch(0.75_0.2_145)] data-[state=checked]:border-[oklch(0.75_0.2_145)]"
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
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.8_0.18_60)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">その他のオプション</h3>
          <span className="badge-orange ml-auto">OPTION</span>
        </div>
        
        <Controller
          name="needsPacking"
          control={control}
          render={({ field }) => (
            <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-[oklch(0.92_0.16_95)] transition-colors">
              <Checkbox
                id="needs-packing"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="w-6 h-6 mt-0.5 border-[2px] border-black rounded-md data-[state=checked]:bg-[oklch(0.92_0.16_95)] data-[state=checked]:border-black"
              />
              <div>
                <Label 
                  htmlFor="needs-packing" 
                  className="text-base font-bold cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-[oklch(0.8_0.18_60)]" />
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

      {/* ナビゲーションボタン */}
      <div className="flex justify-between pt-4 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="h-14 px-6 border-[3px] border-black rounded-xl font-bold text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all bg-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </Button>
        <Button
          type="submit"
          className="pop-button flex-1 max-w-[280px] h-14 text-lg"
        >
          見積もりを確認
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </form>
  );
}
