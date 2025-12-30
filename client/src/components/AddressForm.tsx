/**
 * 住所入力フォームコンポーネント（Step1）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - タブで「市町村入力」と「郵便番号入力」を切り替え
 * - 黒枠のカード
 * - 鮮やかな黄色のボタン
 * - カラフルなアイコンバッジ
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { MapPin, Truck, ArrowRight, Loader2, ArrowDown, Search, MapPinned, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrefectureSelector } from './PrefectureSelector';
import { step1Schema, type Step1FormData, defaultStep1Values } from '@/lib/schema';
import { setStep1Data, setDistanceData, getStep1Data } from '@/lib/store';
import { getDistanceProvider } from '@/lib/distance';
import { getAddressByPostalCode, isValidPostalCode, formatPostalCode } from '@/lib/postal';

type InputMode = 'city' | 'postal';

export function AddressForm() {
  const [, navigate] = useLocation();
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('city');
  
  // 郵便番号入力用の状態
  const [pickupPostalCode, setPickupPostalCode] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [pickupPostalLoading, setPickupPostalLoading] = useState(false);
  const [deliveryPostalLoading, setDeliveryPostalLoading] = useState(false);
  const [pickupPostalAddress, setPickupPostalAddress] = useState<string | null>(null);
  const [deliveryPostalAddress, setDeliveryPostalAddress] = useState<string | null>(null);

  // 保存されたデータがあれば復元
  const savedData = getStep1Data();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: savedData || defaultStep1Values,
  });

  const pickupPrefecture = watch('pickupAddress.prefecture');
  const deliveryPrefecture = watch('deliveryAddress.prefecture');

  // 郵便番号から住所を検索（集荷先）
  const handlePickupPostalSearch = async () => {
    if (!isValidPostalCode(pickupPostalCode)) {
      toast.error('郵便番号は7桁の数字で入力してください');
      return;
    }

    setPickupPostalLoading(true);
    try {
      const result = await getAddressByPostalCode(pickupPostalCode);
      if (result.success && result.address) {
        setValue('pickupAddress.prefecture', result.address.prefecture);
        setValue('pickupAddress.city', result.address.city);
        setPickupPostalAddress(result.address.fullAddress);
        toast.success('住所を取得しました');
      } else {
        toast.error(result.error || '住所の取得に失敗しました');
      }
    } catch (error) {
      toast.error('住所の取得中にエラーが発生しました');
    } finally {
      setPickupPostalLoading(false);
    }
  };

  // 郵便番号から住所を検索（お届け先）
  const handleDeliveryPostalSearch = async () => {
    if (!isValidPostalCode(deliveryPostalCode)) {
      toast.error('郵便番号は7桁の数字で入力してください');
      return;
    }

    setDeliveryPostalLoading(true);
    try {
      const result = await getAddressByPostalCode(deliveryPostalCode);
      if (result.success && result.address) {
        setValue('deliveryAddress.prefecture', result.address.prefecture);
        setValue('deliveryAddress.city', result.address.city);
        setDeliveryPostalAddress(result.address.fullAddress);
        toast.success('住所を取得しました');
      } else {
        toast.error(result.error || '住所の取得に失敗しました');
      }
    } catch (error) {
      toast.error('住所の取得中にエラーが発生しました');
    } finally {
      setDeliveryPostalLoading(false);
    }
  };

  const onSubmit = async (data: Step1FormData) => {
    setIsCalculating(true);
    
    try {
      // 距離を計算
      const provider = getDistanceProvider();
      const distanceResult = await provider.getDistance(
        data.pickupAddress,
        data.deliveryAddress
      );

      // データを保存
      setStep1Data(data);
      setDistanceData(distanceResult);

      // 次のステップへ
      navigate('/step2');
    } catch (error) {
      console.error('Distance calculation failed:', error);
      toast.error('距離の計算に失敗しました。住所を確認してください。');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* 入力方法の切り替えタブ */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-gray-100 rounded-2xl border-[2px] border-black">
          <TabsTrigger 
            value="city" 
            className="rounded-xl h-full text-base font-bold data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <MapPinned className="w-5 h-5 mr-2" />
            市町村から入力
          </TabsTrigger>
          <TabsTrigger 
            value="postal" 
            className="rounded-xl h-full text-base font-bold data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Hash className="w-5 h-5 mr-2" />
            郵便番号から入力
          </TabsTrigger>
        </TabsList>

        {/* 市町村入力モード */}
        <TabsContent value="city" className="mt-6 space-y-6">
          {/* 集荷先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_0)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">集荷先</h3>
              <span className="badge-pink ml-auto">FROM</span>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-prefecture" className="font-bold">
                  都道府県 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <PrefectureSelector
                  value={pickupPrefecture}
                  onValueChange={(value) => setValue('pickupAddress.prefecture', value)}
                  error={!!errors.pickupAddress?.prefecture}
                />
                {errors.pickupAddress?.prefecture && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.pickupAddress.prefecture.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-city" className="font-bold">
                  市町村 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <Input
                  id="pickup-city"
                  placeholder="例：渋谷区"
                  {...register('pickupAddress.city')}
                  className={`border-[2px] border-black rounded-xl h-12 text-base focus:ring-[oklch(0.92_0.16_95)] focus:border-black ${
                    errors.pickupAddress?.city ? 'border-[oklch(0.75_0.2_0)]' : ''
                  }`}
                />
                {errors.pickupAddress?.city && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.pickupAddress.city.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex justify-center py-2">
            <div className="w-14 h-14 rounded-full bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-bounce-subtle">
              <ArrowDown className="w-7 h-7 text-black" />
            </div>
          </div>

          {/* お届け先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_145)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">お届け先</h3>
              <span className="badge-green ml-auto">TO</span>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-prefecture" className="font-bold">
                  都道府県 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <PrefectureSelector
                  value={deliveryPrefecture}
                  onValueChange={(value) => setValue('deliveryAddress.prefecture', value)}
                  error={!!errors.deliveryAddress?.prefecture}
                />
                {errors.deliveryAddress?.prefecture && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.deliveryAddress.prefecture.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-city" className="font-bold">
                  市町村 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <Input
                  id="delivery-city"
                  placeholder="例：大阪市北区"
                  {...register('deliveryAddress.city')}
                  className={`border-[2px] border-black rounded-xl h-12 text-base focus:ring-[oklch(0.92_0.16_95)] focus:border-black ${
                    errors.deliveryAddress?.city ? 'border-[oklch(0.75_0.2_0)]' : ''
                  }`}
                />
                {errors.deliveryAddress?.city && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.deliveryAddress.city.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 郵便番号入力モード */}
        <TabsContent value="postal" className="mt-6 space-y-6">
          {/* 集荷先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_0)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">集荷先</h3>
              <span className="badge-pink ml-auto">FROM</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-postal" className="font-bold">
                  郵便番号 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="pickup-postal"
                    placeholder="例：150-0001"
                    value={pickupPostalCode}
                    onChange={(e) => setPickupPostalCode(e.target.value)}
                    className="border-[2px] border-black rounded-xl h-12 text-base focus:ring-[oklch(0.92_0.16_95)] focus:border-black flex-1"
                    maxLength={8}
                  />
                  <Button
                    type="button"
                    onClick={handlePickupPostalSearch}
                    disabled={pickupPostalLoading}
                    className="pop-button h-12 px-6"
                  >
                    {pickupPostalLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        検索
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">ハイフンあり・なしどちらでもOK</p>
              </div>
              
              {pickupPostalAddress && (
                <div className="p-4 bg-[oklch(0.98_0.02_95)] rounded-xl border-[2px] border-dashed border-[oklch(0.8_0.1_95)]">
                  <p className="text-sm text-gray-600 mb-1">取得した住所</p>
                  <p className="font-bold text-lg">{pickupPostalAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex justify-center py-2">
            <div className="w-14 h-14 rounded-full bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-bounce-subtle">
              <ArrowDown className="w-7 h-7 text-black" />
            </div>
          </div>

          {/* お届け先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_145)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">お届け先</h3>
              <span className="badge-green ml-auto">TO</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-postal" className="font-bold">
                  郵便番号 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="delivery-postal"
                    placeholder="例：530-0001"
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value)}
                    className="border-[2px] border-black rounded-xl h-12 text-base focus:ring-[oklch(0.92_0.16_95)] focus:border-black flex-1"
                    maxLength={8}
                  />
                  <Button
                    type="button"
                    onClick={handleDeliveryPostalSearch}
                    disabled={deliveryPostalLoading}
                    className="pop-button h-12 px-6"
                  >
                    {deliveryPostalLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        検索
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">ハイフンあり・なしどちらでもOK</p>
              </div>
              
              {deliveryPostalAddress && (
                <div className="p-4 bg-[oklch(0.95_0.03_145)] rounded-xl border-[2px] border-dashed border-[oklch(0.7_0.15_145)]">
                  <p className="text-sm text-gray-600 mb-1">取得した住所</p>
                  <p className="font-bold text-lg">{deliveryPostalAddress}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 送信ボタン */}
      <div className="flex justify-center pt-4">
        <Button
          type="submit"
          disabled={isCalculating}
          className="pop-button min-w-[240px] h-14 text-lg px-8"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              距離を計算中...
            </>
          ) : (
            <>
              次へ進む
              <ArrowRight className="w-6 h-6 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
