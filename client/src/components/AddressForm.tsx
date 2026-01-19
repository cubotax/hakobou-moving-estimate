/**
 * 住所入力フォームコンポーネント（Step1）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - タブで「市町村入力」と「郵便番号入力」を切り替え
 * - 黒枠のカード
 * - 鮮やかな黄色のボタン
 * - カラフルなアイコンバッジ
 * - 町名バリデーション機能
 * - 日付選択機能（集荷日・お届け日）
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { MapPin, Truck, ArrowRight, ArrowLeft, Loader2, ArrowDown, Search, MapPinned, Hash, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
// toast removed

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrefectureSelector } from './PrefectureSelector';
import { step1Schema, type Step1FormData, defaultStep1Values } from '@/lib/schema';
import { setStep1Data, setDistanceData, getStep1Data } from '@/lib/store';
import { getDistanceProvider } from '@/lib/distance';
import { getAddressByPostalCode, isValidPostalCode, validateAddress } from '@/lib/postal';
import { isBusySeason, calculateStorageDays } from '@/lib/pricing';
import { BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG } from '@/lib/config';
import { toHalfWidth, formatPostalCode, cn } from '@/lib/utils';

type InputMode = 'city' | 'postal';

export function AddressForm() {
  const [, navigate] = useLocation();
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('postal');

  // ページ読み込み時にトップにスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  // 郵便番号エラー状態
  const [pickupPostalError, setPickupPostalError] = useState<string | null>(null);
  const [deliveryPostalError, setDeliveryPostalError] = useState<string | null>(null);

  // 送信時の住所未確定エラー状態
  const [pickupNotConfirmedError, setPickupNotConfirmedError] = useState(false);
  const [deliveryNotConfirmedError, setDeliveryNotConfirmedError] = useState(false);

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
  const pickupCity = watch('pickupAddress.city');
  const pickupTown = watch('pickupAddress.town');
  const deliveryPrefecture = watch('deliveryAddress.prefecture');
  const deliveryCity = watch('deliveryAddress.city');
  const deliveryTown = watch('deliveryAddress.town');

  // 住所入力用（IME入力中は変換しない）
  const handleAddressBlur = (fieldName: any) => {
    const value = watch(fieldName);
    if (value) {
      setValue(fieldName, toHalfWidth(value));
    }
  };

  // 集荷先住所のバリデーション
  const handleValidatePickupAddress = async () => {
    if (!pickupPrefecture || !pickupCity || !pickupTown) {
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
      } else {
        setPickupValidationError(result.errorMessage || '住所が見つかりませんでした');
      }
    } catch (error) {
      setPickupValidationError('住所の確認中にエラーが発生しました');
    } finally {
      setPickupValidating(false);
    }
  };

  // お届け先住所のバリデーション
  const handleValidateDeliveryAddress = async () => {
    if (!deliveryPrefecture || !deliveryCity || !deliveryTown) {
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
      } else {
        setDeliveryValidationError(result.errorMessage || '住所が見つかりませんでした');
      }
    } catch (error) {
      setDeliveryValidationError('住所の確認中にエラーが発生しました');
    } finally {
      setDeliveryValidating(false);
    }
  };

  // 郵便番号から住所を検索（集荷先）
  const handlePickupPostalSearch = async () => {
    if (!isValidPostalCode(pickupPostalCode)) {
      return;
    }

    setPickupPostalLoading(true);
    setPickupPostalError(null);
    setPickupPostalAddress(null);
    setPickupNotConfirmedError(false);
    try {
      const result = await getAddressByPostalCode(pickupPostalCode);
      if (result.success && result.address) {
        setValue('pickupAddress.prefecture', result.address.prefecture);
        setValue('pickupAddress.city', result.address.city);
        setValue('pickupAddress.town', result.address.town);
        setPickupPostalAddress(result.address.fullAddress);
        setPickupValidated(true);
        setPickupValidationError(null);
        setPickupPostalError(null);
      } else {
        setPickupPostalError(result.error || '該当する住所が見つかりませんでした');
      }
    } catch (error) {
      setPickupPostalError('住所の取得中にエラーが発生しました');
    } finally {
      setPickupPostalLoading(false);
    }
  };

  // 郵便番号から住所を検索（お届け先）
  const handleDeliveryPostalSearch = async () => {
    if (!isValidPostalCode(deliveryPostalCode)) {
      return;
    }

    setDeliveryPostalLoading(true);
    setDeliveryPostalError(null);
    setDeliveryPostalAddress(null);
    setDeliveryNotConfirmedError(false);
    try {
      const result = await getAddressByPostalCode(deliveryPostalCode);
      if (result.success && result.address) {
        setValue('deliveryAddress.prefecture', result.address.prefecture);
        setValue('deliveryAddress.city', result.address.city);
        setValue('deliveryAddress.town', result.address.town);
        setDeliveryPostalAddress(result.address.fullAddress);
        setDeliveryValidated(true);
        setDeliveryValidationError(null);
        setDeliveryPostalError(null);
      } else {
        setDeliveryPostalError(result.error || '該当する住所が見つかりませんでした');
      }
    } catch (error) {
      setDeliveryPostalError('住所の取得中にエラーが発生しました');
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

  const onSubmit = async (data: Step1FormData) => {
    // エラー状態をリセット
    setPickupNotConfirmedError(false);
    setDeliveryNotConfirmedError(false);

    // 市町村入力モードの場合、バリデーションを確認
    if (inputMode === 'city') {
      let hasError = false;
      if (!pickupValidated) {
        setPickupNotConfirmedError(true);
        hasError = true;
      }
      if (!deliveryValidated) {
        setDeliveryNotConfirmedError(true);
        hasError = true;
      }
      if (hasError) {
        return;
      }
    }

    // 郵便番号入力モードの場合、住所確定済みか確認
    if (inputMode === 'postal') {
      let hasError = false;
      if (!pickupValidated) {
        setPickupNotConfirmedError(true);
        hasError = true;
      }
      if (!deliveryValidated) {
        setDeliveryNotConfirmedError(true);
        hasError = true;
      }
      if (hasError) {
        return;
      }
    }

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
    } finally {
      setIsCalculating(false);
    }
  };
  // フォーム送信時のバリデーションチェック
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // エラー状態をリセット
    setPickupNotConfirmedError(false);
    setDeliveryNotConfirmedError(false);

    // 住所確定済みチェック
    let hasError = false;
    if (!pickupValidated) {
      setPickupNotConfirmedError(true);
      hasError = true;
    }
    if (!deliveryValidated) {
      setDeliveryNotConfirmedError(true);
      hasError = true;
    }

    // エラーがあれば送信しない
    if (hasError) {
      return;
    }

    // フォームを送信
    handleSubmit(onSubmit)();
  };


  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 animate-fade-in">
      {/* 説明文 */}
      <p className="text-center text-gray-600 font-bold text-sm">
        住所・郵便番号のどちらからでも入力できます！
      </p>

      {/* 入力方法の切り替えタブ */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-16 p-2 bg-gray-100 rounded-2xl border-[3px] border-black">
          <TabsTrigger
            value="postal"
            className="rounded-xl h-full text-base font-bold data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Hash className="w-5 h-5 mr-2" />
            郵便番号から入力
          </TabsTrigger>
          <TabsTrigger
            value="city"
            className="rounded-xl h-full text-base font-bold data-[state=active]:bg-[oklch(0.92_0.16_95)] data-[state=active]:text-black data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <MapPinned className="w-5 h-5 mr-2" />
            住所から入力
          </TabsTrigger>
        </TabsList>


        {/* 住所入力モード */}
        <TabsContent value="city" className="mt-6 space-y-6">
          {/* 集荷先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.2_0)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">集荷先</h3>
              <span className="badge-pink-no-border ml-auto">FROM</span>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="pickup-prefecture" className="font-bold">
                  都道府県 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <PrefectureSelector
                  value={pickupPrefecture}
                  onValueChange={(value) => {
                    setValue('pickupAddress.prefecture', value);
                    handlePickupInputChange();
                  }}
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
                  市区町村 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="pickup-city"
                    placeholder="例：青森市"
                    {...register('pickupAddress.city', {
                      onChange: handlePickupInputChange,
                      onBlur: () => handleAddressBlur('pickupAddress.city'),
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleValidatePickupAddress();
                      }
                    }}
                    className="pop-input pr-16"
                  />
                  {!!pickupCity && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
                {errors.pickupAddress?.city && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.pickupAddress.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup-town" className="font-bold">
                  町名 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="pickup-town"
                    placeholder="例：新町"
                    {...register('pickupAddress.town', {
                      onChange: handlePickupInputChange,
                      onBlur: () => handleAddressBlur('pickupAddress.town'),
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleValidatePickupAddress();
                      }
                    }}
                    className="pop-input pr-16"
                  />
                  {!!pickupTown && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
                {errors.pickupAddress?.town && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.pickupAddress.town.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">※町名までの入力で番地は不要です。</p>
              </div>

              {/* 住所を確定ボタン */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleValidatePickupAddress}
                  disabled={pickupValidating || !pickupPrefecture || !pickupCity || !pickupTown}
                  className={cn(
                    "border-[3px] rounded-xl font-bold",
                    pickupPrefecture && pickupCity && pickupTown && "bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.14_95)]"
                  )}
                  style={{ borderColor: 'black' }}
                >
                  {pickupValidating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  住所を確定
                </Button>
              </div>

              {/* バリデーション結果 */}
              {!!pickupValidated && (
                <div className="flex items-center gap-2 p-3 bg-[oklch(0.95_0.1_145)] rounded-xl border-2 border-[oklch(0.7_0.15_145)]">
                  <CheckCircle2 className="w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  <span className="text-sm font-bold text-[oklch(0.4_0.1_145)]">確認済み</span>
                </div>
              )}
              {!!pickupValidationError && (
                <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium text-center">
                  {pickupValidationError}
                </p>
              )}
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-[3px] border-black animate-bounce-slow">
              <ArrowDown className="w-6 h-6" />
            </div>
          </div>

          {/* お届け先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.7_0.15_145)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">お届け先</h3>
              <span className="badge-green-no-border ml-auto">TO</span>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="delivery-prefecture" className="font-bold">
                  都道府県 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <PrefectureSelector
                  value={deliveryPrefecture}
                  onValueChange={(value) => {
                    setValue('deliveryAddress.prefecture', value);
                    handleDeliveryInputChange();
                  }}
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
                  市区町村 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="delivery-city"
                    placeholder="例：仙台市青葉区"
                    {...register('deliveryAddress.city', {
                      onChange: handleDeliveryInputChange,
                      onBlur: () => handleAddressBlur('deliveryAddress.city'),
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleValidateDeliveryAddress();
                      }
                    }}
                    className="pop-input pr-16"
                  />
                  {!!deliveryCity && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
                {errors.deliveryAddress?.city && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.deliveryAddress.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-town" className="font-bold">
                  町名 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="delivery-town"
                    placeholder="例：中央"
                    {...register('deliveryAddress.town', {
                      onChange: handleDeliveryInputChange,
                      onBlur: () => handleAddressBlur('deliveryAddress.town'),
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleValidateDeliveryAddress();
                      }
                    }}
                    className="pop-input pr-16"
                  />
                  {!!deliveryTown && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
                {errors.deliveryAddress?.town && (
                  <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                    {errors.deliveryAddress.town.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">※町名までの入力で番地は不要です。</p>
              </div>

              {/* 住所確定ボタン */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleValidateDeliveryAddress}
                  disabled={deliveryValidating || !deliveryPrefecture || !deliveryCity || !deliveryTown}
                  className={cn(
                    "border-[3px] rounded-xl font-bold",
                    deliveryPrefecture && deliveryCity && deliveryTown && "bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.14_95)]"
                  )}
                  style={{ borderColor: 'black' }}
                >
                  {deliveryValidating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  住所を確定
                </Button>
              </div>


              {/* バリデーション結果 */}
              {!!deliveryValidated && (
                <div className="flex items-center gap-2 p-3 bg-[oklch(0.95_0.1_145)] rounded-xl border-2 border-[oklch(0.7_0.15_145)]">
                  <CheckCircle2 className="w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  <span className="text-sm font-bold text-[oklch(0.4_0.1_145)]">確認済み</span>
                </div>
              )}
              {!!deliveryValidationError && (
                <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium text-center">
                  {deliveryValidationError}
                </p>
              )}
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
              <span className="badge-pink-no-border ml-auto">FROM</span>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="pickup-postal" className="font-bold">
                  郵便番号 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <input
                    id="pickup-postal"
                    placeholder="例：0300801"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pickupPostalCode}
                    onChange={(e) => setPickupPostalCode(formatPostalCode(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isValidPostalCode(pickupPostalCode)) {
                          handlePickupPostalSearch();
                        }
                      }
                    }}
                    className="pop-input pr-16"
                    style={{ fontSize: '1.25rem' }}
                  />
                  {isValidPostalCode(pickupPostalCode) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
              </div>

              {/* 住所を確定ボタン */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePickupPostalSearch}
                  disabled={pickupPostalLoading}
                  className={cn(
                    "border-[3px] rounded-xl font-bold",
                    isValidPostalCode(pickupPostalCode) && "bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.14_95)]"
                  )}
                  style={{ borderColor: 'black' }}
                >
                  {pickupPostalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  住所を確定
                </Button>
              </div>

              {!!pickupPostalAddress && (
                <div className="p-4 bg-[oklch(0.95_0.1_145)] rounded-xl border-2 border-[oklch(0.7_0.15_145)]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                    <span className="font-bold text-[oklch(0.4_0.1_145)]">取得した住所</span>
                  </div>
                  <p className="text-lg font-medium">{pickupPostalAddress}</p>
                </div>
              )}
              {!!pickupPostalError && (
                <div className="p-4 bg-[oklch(0.95_0.15_25)] rounded-xl border-2 border-[oklch(0.65_0.2_25)]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-[oklch(0.5_0.2_25)]" />
                    <span className="font-bold text-[oklch(0.4_0.15_25)]">エラー</span>
                  </div>
                  <p className="text-base font-medium text-[oklch(0.35_0.1_25)]">{pickupPostalError}</p>
                </div>
              )}
              {pickupNotConfirmedError && !pickupPostalAddress && (
                <div className="p-4 bg-[oklch(0.95_0.15_25)] rounded-xl border-2 border-[oklch(0.65_0.2_25)]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[oklch(0.5_0.2_25)]" />
                    <span className="font-bold text-[oklch(0.4_0.15_25)]">住所を確定してください</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 矢印 */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-[3px] border-black animate-bounce-slow">
              <ArrowDown className="w-6 h-6" />
            </div>
          </div>

          {/* お届け先 */}
          <div className="pop-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.7_0.15_145)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black">お届け先</h3>
              <span className="badge-green-no-border ml-auto">TO</span>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="delivery-postal" className="font-bold">
                  郵便番号 <span className="text-[oklch(0.75_0.2_0)]">*</span>
                </Label>
                <div className="relative">
                  <input
                    id="delivery-postal"
                    placeholder="例：9800021"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(formatPostalCode(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isValidPostalCode(deliveryPostalCode)) {
                          handleDeliveryPostalSearch();
                        }
                      }
                    }}
                    className="pop-input pr-16"
                    style={{ fontSize: '1.25rem' }}
                  />
                  {isValidPostalCode(deliveryPostalCode) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                  )}
                </div>
              </div>

              {/* 住所を確定ボタン */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDeliveryPostalSearch}
                  disabled={deliveryPostalLoading}
                  className={cn(
                    "border-[3px] rounded-xl font-bold",
                    isValidPostalCode(deliveryPostalCode) && "bg-[oklch(0.92_0.16_95)] hover:bg-[oklch(0.88_0.14_95)]"
                  )}
                  style={{ borderColor: 'black' }}
                >
                  {deliveryPostalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  住所を確定
                </Button>
              </div>

              {!!deliveryPostalAddress && (
                <div className="p-4 bg-[oklch(0.95_0.1_145)] rounded-xl border-2 border-[oklch(0.7_0.15_145)]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-[oklch(0.5_0.15_145)]" />
                    <span className="font-bold text-[oklch(0.4_0.1_145)]">取得した住所</span>
                  </div>
                  <p className="text-lg font-medium">{deliveryPostalAddress}</p>
                </div>
              )}
              {!!deliveryPostalError && (
                <div className="p-4 bg-[oklch(0.95_0.15_25)] rounded-xl border-2 border-[oklch(0.65_0.2_25)]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-[oklch(0.5_0.2_25)]" />
                    <span className="font-bold text-[oklch(0.4_0.15_25)]">エラー</span>
                  </div>
                  <p className="text-base font-medium text-[oklch(0.35_0.1_25)]">{deliveryPostalError}</p>
                </div>
              )}
              {deliveryNotConfirmedError && !deliveryPostalAddress && (
                <div className="p-4 bg-[oklch(0.95_0.15_25)] rounded-xl border-2 border-[oklch(0.65_0.2_25)]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[oklch(0.5_0.2_25)]" />
                    <span className="font-bold text-[oklch(0.4_0.15_25)]">住所を確定してください</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </TabsContent>
      </Tabs>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between pt-4 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/')}
          className="h-14 px-6 border-[3px] border-black rounded-xl font-bold text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all bg-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </Button>
        <Button
          type="submit"
          disabled={isCalculating}
          className="pop-button flex-1 max-w-[280px] h-14 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              距離を計算中...
            </>
          ) : (
            <>
              <span className="font-bold">プラン選択へ</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
