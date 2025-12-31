/**
 * 住所入力ページ（Step2）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - タブで「市町村入力」と「郵便番号入力」を切り替え
 * - 黒枠のカード
 * - 鮮やかな黄色のボタン
 * - 町名バリデーション機能
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { MapPin, Truck, ArrowRight, Loader2, ArrowDown, Search, MapPinned, Hash, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrefectureSelector } from '@/components/PrefectureSelector';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { setStep1Data, setDistanceData, getStep1Data, getDateData } from '@/lib/store';
import { getDistanceProvider } from '@/lib/distance';
import { getAddressByPostalCode, isValidPostalCode, validateAddress } from '@/lib/postal';
import { PREFECTURES, FORM_CONFIG } from '@/lib/config';

type InputMode = 'city' | 'postal';

// 住所入力用のスキーマ
const addressSchema = z.object({
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

const addressFormSchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
});

type AddressFormData = z.infer<typeof addressFormSchema>;

const defaultAddressValues: AddressFormData = {
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
};

export default function AddressInput() {
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

  // 住所バリデーション状態
  const [pickupValidating, setPickupValidating] = useState(false);
  const [deliveryValidating, setDeliveryValidating] = useState(false);
  const [pickupValidated, setPickupValidated] = useState(false);
  const [deliveryValidated, setDeliveryValidated] = useState(false);
  const [pickupValidationError, setPickupValidationError] = useState<string | null>(null);
  const [deliveryValidationError, setDeliveryValidationError] = useState<string | null>(null);

  // 日付データを取得
  const dateData = getDateData();
  
  // 日付が選択されていない場合は日程選択ページへリダイレクト
  useEffect(() => {
    if (!dateData) {
      toast.error('まず日程を選択してください');
      navigate('/');
    }
  }, [dateData, navigate]);

  // 保存されたデータがあれば復元
  const savedData = getStep1Data();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: savedData ? {
      pickupAddress: savedData.pickupAddress,
      deliveryAddress: savedData.deliveryAddress,
    } : defaultAddressValues,
  });

  const pickupPrefecture = watch('pickupAddress.prefecture');
  const pickupCity = watch('pickupAddress.city');
  const pickupTown = watch('pickupAddress.town');
  const deliveryPrefecture = watch('deliveryAddress.prefecture');
  const deliveryCity = watch('deliveryAddress.city');
  const deliveryTown = watch('deliveryAddress.town');

  // 集荷先住所のバリデーション
  const handleValidatePickupAddress = async () => {
    if (!pickupPrefecture || !pickupCity || !pickupTown) {
      toast.error('都道府県、市区町村、町名をすべて入力してください');
      return;
    }

    setPickupValidating(true);
    setPickupValidationError(null);
    setPickupValidated(false);

    try {
      const result = await validateAddress({
        prefecture: pickupPrefecture,
        city: pickupCity,
        town: pickupTown,
      });

      if (result.isValid) {
        setPickupValidated(true);
        toast.success('住所が確認できました');
      } else {
        setPickupValidationError(result.errorMessage || '住所が見つかりませんでした');
        toast.error(result.errorMessage || '住所が見つかりませんでした');
      }
    } catch (error) {
      setPickupValidationError('住所の確認中にエラーが発生しました');
      toast.error('住所の確認中にエラーが発生しました');
    } finally {
      setPickupValidating(false);
    }
  };

  // お届け先住所のバリデーション
  const handleValidateDeliveryAddress = async () => {
    if (!deliveryPrefecture || !deliveryCity || !deliveryTown) {
      toast.error('都道府県、市区町村、町名をすべて入力してください');
      return;
    }

    setDeliveryValidating(true);
    setDeliveryValidationError(null);
    setDeliveryValidated(false);

    try {
      const result = await validateAddress({
        prefecture: deliveryPrefecture,
        city: deliveryCity,
        town: deliveryTown,
      });

      if (result.isValid) {
        setDeliveryValidated(true);
        toast.success('住所が確認できました');
      } else {
        setDeliveryValidationError(result.errorMessage || '住所が見つかりませんでした');
        toast.error(result.errorMessage || '住所が見つかりませんでした');
      }
    } catch (error) {
      setDeliveryValidationError('住所の確認中にエラーが発生しました');
      toast.error('住所の確認中にエラーが発生しました');
    } finally {
      setDeliveryValidating(false);
    }
  };

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
        setValue('pickupAddress.town', result.address.town);
        setPickupPostalAddress(result.address.fullAddress);
        setPickupValidated(true);
        setPickupValidationError(null);
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
        setValue('deliveryAddress.town', result.address.town);
        setDeliveryPostalAddress(result.address.fullAddress);
        setDeliveryValidated(true);
        setDeliveryValidationError(null);
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

  // 入力値が変更されたらバリデーション状態をリセット
  const handlePickupInputChange = () => {
    setPickupValidated(false);
    setPickupValidationError(null);
  };

  const handleDeliveryInputChange = () => {
    setDeliveryValidated(false);
    setDeliveryValidationError(null);
  };

  const onSubmit = async (data: AddressFormData) => {
    // 市町村入力モードの場合、バリデーションを確認
    if (inputMode === 'city') {
      if (!pickupValidated) {
        toast.error('集荷先の住所を確認してください');
        return;
      }
      if (!deliveryValidated) {
        toast.error('お届け先の住所を確認してください');
        return;
      }
    }

    if (!dateData) {
      toast.error('日程を選択してください');
      navigate('/');
      return;
    }

    setIsCalculating(true);
    
    try {
      // 距離を計算
      const provider = getDistanceProvider();
      const distanceResult = await provider.getDistance(
        data.pickupAddress,
        data.deliveryAddress
      );

      // データを保存（日付データも含めて）
      setStep1Data({
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        dates: {
          pickupDate: dateData.pickupDate,
          deliveryDate: dateData.deliveryDate,
        },
      });
      setDistanceData(distanceResult);

      // 次のステップへ
      navigate('/condition');
    } catch (error) {
      console.error('Distance calculation failed:', error);
      toast.error('距離の計算に失敗しました。住所を確認してください。');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleBack = () => {
    navigate('/');
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
            住所を入力してください！
          </p>
        </div>
      </header>

      {/* ステップインジケーター */}
      <StepIndicator steps={ESTIMATE_STEPS} currentStep={2} className="mb-6" />

      {/* メインコンテンツ */}
      <main className="px-4 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto space-y-6">
          {/* 入力モード切り替えタブ */}
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
            <TabsList className="w-full grid grid-cols-2 h-14 bg-gray-100 p-1 rounded-2xl border-3 border-black">
              <TabsTrigger 
                value="city" 
                className="h-full rounded-xl font-bold text-base data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <MapPinned className="w-4 h-4 mr-2" />
                市町村から入力
              </TabsTrigger>
              <TabsTrigger 
                value="postal" 
                className="h-full rounded-xl font-bold text-base data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Hash className="w-4 h-4 mr-2" />
                郵便番号から入力
              </TabsTrigger>
            </TabsList>

            {/* 市町村入力モード */}
            <TabsContent value="city" className="mt-6 space-y-6">
              {/* 集荷先 */}
              <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center border-2 border-black">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-black">集荷先</h2>
                  <span className="ml-auto bg-pink-400 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                    FROM
                  </span>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label className="font-bold">
                      都道府県 <span className="text-pink-500">*</span>
                    </Label>
                    <PrefectureSelector
                      value={pickupPrefecture}
                      onValueChange={(value: string) => {
                        setValue('pickupAddress.prefecture', value);
                        handlePickupInputChange();
                      }}
                      placeholder="都道府県を選択"
                      className="mt-1"
                    />
                    {errors.pickupAddress?.prefecture && (
                      <p className="text-pink-500 text-sm mt-1">{errors.pickupAddress.prefecture.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold">
                      市区町村 <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      {...register('pickupAddress.city')}
                      onChange={(e) => {
                        register('pickupAddress.city').onChange(e);
                        handlePickupInputChange();
                      }}
                      placeholder="例：渋谷区"
                      className="mt-1 border-2 border-black rounded-xl h-12 font-medium"
                    />
                    {errors.pickupAddress?.city && (
                      <p className="text-pink-500 text-sm mt-1">{errors.pickupAddress.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold">
                      町名 <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      {...register('pickupAddress.town')}
                      onChange={(e) => {
                        register('pickupAddress.town').onChange(e);
                        handlePickupInputChange();
                      }}
                      placeholder="例：神宮前"
                      className="mt-1 border-2 border-black rounded-xl h-12 font-medium"
                    />
                    {errors.pickupAddress?.town && (
                      <p className="text-pink-500 text-sm mt-1">{errors.pickupAddress.town.message}</p>
                    )}
                  </div>

                  {/* 住所確認ボタン */}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleValidatePickupAddress}
                      disabled={pickupValidating || !pickupPrefecture || !pickupCity || !pickupTown}
                      className="bg-[oklch(0.85_0.15_200)] hover:bg-[oklch(0.8_0.15_200)] text-black font-bold border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      {pickupValidating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      住所を確認
                    </Button>

                    {pickupValidated && (
                      <div className="flex items-center gap-2 text-[oklch(0.75_0.2_145)] font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        確認済み
                      </div>
                    )}
                    {pickupValidationError && (
                      <p className="text-pink-500 text-sm">{pickupValidationError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 矢印 */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-[oklch(0.92_0.16_95)] rounded-full flex items-center justify-center border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <ArrowDown className="w-6 h-6 text-black" />
                </div>
              </div>

              {/* お届け先 */}
              <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[oklch(0.75_0.2_145)] rounded-full flex items-center justify-center border-2 border-black">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-black">お届け先</h2>
                  <span className="ml-auto bg-[oklch(0.75_0.2_145)] text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                    TO
                  </span>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label className="font-bold">
                      都道府県 <span className="text-pink-500">*</span>
                    </Label>
                    <PrefectureSelector
                      value={deliveryPrefecture}
                      onValueChange={(value: string) => {
                        setValue('deliveryAddress.prefecture', value);
                        handleDeliveryInputChange();
                      }}
                      placeholder="都道府県を選択"
                      className="mt-1"
                    />
                    {errors.deliveryAddress?.prefecture && (
                      <p className="text-pink-500 text-sm mt-1">{errors.deliveryAddress.prefecture.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold">
                      市区町村 <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      {...register('deliveryAddress.city')}
                      onChange={(e) => {
                        register('deliveryAddress.city').onChange(e);
                        handleDeliveryInputChange();
                      }}
                      placeholder="例：新宿区"
                      className="mt-1 border-2 border-black rounded-xl h-12 font-medium"
                    />
                    {errors.deliveryAddress?.city && (
                      <p className="text-pink-500 text-sm mt-1">{errors.deliveryAddress.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold">
                      町名 <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      {...register('deliveryAddress.town')}
                      onChange={(e) => {
                        register('deliveryAddress.town').onChange(e);
                        handleDeliveryInputChange();
                      }}
                      placeholder="例：西新宿"
                      className="mt-1 border-2 border-black rounded-xl h-12 font-medium"
                    />
                    {errors.deliveryAddress?.town && (
                      <p className="text-pink-500 text-sm mt-1">{errors.deliveryAddress.town.message}</p>
                    )}
                  </div>

                  {/* 住所確認ボタン */}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleValidateDeliveryAddress}
                      disabled={deliveryValidating || !deliveryPrefecture || !deliveryCity || !deliveryTown}
                      className="bg-[oklch(0.85_0.15_200)] hover:bg-[oklch(0.8_0.15_200)] text-black font-bold border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      {deliveryValidating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      住所を確認
                    </Button>

                    {deliveryValidated && (
                      <div className="flex items-center gap-2 text-[oklch(0.75_0.2_145)] font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        確認済み
                      </div>
                    )}
                    {deliveryValidationError && (
                      <p className="text-pink-500 text-sm">{deliveryValidationError}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 郵便番号入力モード */}
            <TabsContent value="postal" className="mt-6 space-y-6">
              {/* 集荷先 */}
              <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center border-2 border-black">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-black">集荷先</h2>
                  <span className="ml-auto bg-pink-400 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                    FROM
                  </span>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label className="font-bold">
                      郵便番号 <span className="text-pink-500">*</span>
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={pickupPostalCode}
                        onChange={(e) => setPickupPostalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                        placeholder="1234567"
                        maxLength={7}
                        className="border-2 border-black rounded-xl h-12 font-medium flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handlePickupPostalSearch}
                        disabled={pickupPostalLoading}
                        className="bg-[oklch(0.85_0.15_200)] hover:bg-[oklch(0.8_0.15_200)] text-black font-bold border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-12"
                      >
                        {pickupPostalLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {pickupPostalAddress && (
                    <div className="bg-[oklch(0.95_0.05_145)] border-2 border-[oklch(0.75_0.2_145)] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-[oklch(0.75_0.2_145)] font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        {pickupPostalAddress}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 矢印 */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-[oklch(0.92_0.16_95)] rounded-full flex items-center justify-center border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <ArrowDown className="w-6 h-6 text-black" />
                </div>
              </div>

              {/* お届け先 */}
              <div className="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[oklch(0.75_0.2_145)] rounded-full flex items-center justify-center border-2 border-black">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-black">お届け先</h2>
                  <span className="ml-auto bg-[oklch(0.75_0.2_145)] text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black">
                    TO
                  </span>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label className="font-bold">
                      郵便番号 <span className="text-pink-500">*</span>
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                        placeholder="1234567"
                        maxLength={7}
                        className="border-2 border-black rounded-xl h-12 font-medium flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleDeliveryPostalSearch}
                        disabled={deliveryPostalLoading}
                        className="bg-[oklch(0.85_0.15_200)] hover:bg-[oklch(0.8_0.15_200)] text-black font-bold border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all h-12"
                      >
                        {deliveryPostalLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {deliveryPostalAddress && (
                    <div className="bg-[oklch(0.95_0.05_145)] border-2 border-[oklch(0.75_0.2_145)] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-[oklch(0.75_0.2_145)] font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        {deliveryPostalAddress}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ナビゲーションボタン */}
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={handleBack}
              className="flex-1 h-14 text-lg font-black bg-gray-200 hover:bg-gray-300 text-black border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              戻る
            </Button>
            <Button
              type="submit"
              disabled={isCalculating}
              className="flex-1 h-14 text-lg font-black bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.16_95)] text-black border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  次へ進む
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
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
