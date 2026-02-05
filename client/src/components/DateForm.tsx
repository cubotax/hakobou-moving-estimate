/**
 * 日付入力フォームコンポーネント（Step0）
 *
 * 要件：
 * - リロードしたら常に「今日」から開始（保存データが残っていても復元しない）
 * - ただし「条件変更 / 戻る」で Step0 に戻った場合は、直前の入力値を復元したい
 *
 * 実装方針（安定版）：
 * - Step0の日付だけは sessionStorage に保存（戻る用）
 * - 「このタブで最初のレンダー（= リロード直後）」のときだけ sessionStorage を削除して今日にする
 *   → SPA内の戻る（Step1→Step0）は同じJSが生きているので、削除されず復元される
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowDown, AlertCircle, Calendar, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerField } from './DatePickerField';
import { dateFormSchema, type DateFormData, type Step1FormData, type TimeSlot, defaultStep1Values, timeSlotLabels } from '@/lib/schema';
import { setStep1Data, getStep1Data } from '@/lib/store';
import { isBusySeason, calculateStorageDays } from '@/lib/pricing';
import { BUSY_SEASON_CONFIG, STORAGE_FEE_CONFIG } from '@/lib/config';
import { fetchPricingSettings, PricingSettings } from '@/lib/pricingApi';

// タイピングアニメーションコンポーネント
const AnimatedText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        // タイピング完了後、カーソルを非表示
        setTimeout(() => setShowCursor(false), 500);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayedText}
      {showCursor && <span className="typing-cursor">|</span>}
    </span>
  );
};


/** ✅ ローカル日付で「今日」を作る（UTCズレ回避） */
const getTodayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isValidYMD = (v?: string) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const today = getTodayYMD();

/**
 * 表示制御フラグ
 * - 今は積み置き料金メッセージを非表示にしたいが、後で復活できるようにフラグで制御する
 *   true  => 表示
 *   false => 非表示（現在）
 */
const SHOW_STORAGE_FEE_MESSAGE = false;

/** ✅ Step0の戻り用セッション保存キー */
const STEP0_DATES_SESSION_KEY = 'hakobou_step0_dates';

type SessionDates = {
  pickupDate: string;
  deliveryDate: string;
  pickupTimeSlot: TimeSlot;
  deliveryTimeSlot: TimeSlot;
};

const loadSessionDates = (): SessionDates | null => {
  try {
    const raw = sessionStorage.getItem(STEP0_DATES_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionDates>;
    if (!isValidYMD(parsed.pickupDate) || !isValidYMD(parsed.deliveryDate)) return null;
    return {
      pickupDate: parsed.pickupDate!,
      deliveryDate: parsed.deliveryDate!,
      pickupTimeSlot: parsed.pickupTimeSlot || '',
      deliveryTimeSlot: parsed.deliveryTimeSlot || '',
    };
  } catch {
    return null;
  }
};

const saveSessionDates = (dates: SessionDates) => {
  try {
    sessionStorage.setItem(STEP0_DATES_SESSION_KEY, JSON.stringify(dates));
  } catch {
    // ignore
  }
};

/**
 * ✅ ここがポイント：このモジュールが読み込まれてから「初回レンダーか」を覚えるフラグ
 * - リロードするとJSが再ロードされるので false に戻る
 * - SPA内の画面遷移（戻る/条件変更）では true のまま
 */
let didClearOnThisTabBoot = false;

export function DateForm() {
  const [, navigate] = useLocation();
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);

  // ページ読み込み時にトップにスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 料金設定を取得
  useEffect(() => {
    fetchPricingSettings().then(setPricingSettings);
  }, []);

  /**
   * ✅ リロード直後（=このタブで最初のレンダー）のときだけ、戻る用セッションを削除
   * これを「useFormより前」に同期的に実行することで、初期表示が古い日付にならない
   */
  if (typeof window !== 'undefined' && !didClearOnThisTabBoot) {
    didClearOnThisTabBoot = true;
    sessionStorage.removeItem(STEP0_DATES_SESSION_KEY);
  }

  /**
   * ✅ defaultValues の決定
   * - リロード直後は上で sessionStorage を消している → 常に今日
   * - SPA内で戻ってきた場合は sessionStorage が残っている → 復元
   */
  const sessionDates = typeof window !== 'undefined' ? loadSessionDates() : null;

  const {
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState,
  } = useForm<DateFormData>({
    resolver: zodResolver(dateFormSchema),
    mode: 'onChange',
    defaultValues: {
      dates: {
        pickupDate: sessionDates?.pickupDate || today,
        deliveryDate: sessionDates?.deliveryDate || today,
        pickupTimeSlot: sessionDates?.pickupTimeSlot || '',
        deliveryTimeSlot: sessionDates?.deliveryTimeSlot || '',
      },
    },
  });

  const pickupDate = watch('dates.pickupDate');
  const deliveryDate = watch('dates.deliveryDate');
  const pickupTimeSlot = watch('dates.pickupTimeSlot');
  const deliveryTimeSlot = watch('dates.deliveryTimeSlot');

  /**
   * ✅ 入力値を sessionStorage に保存（戻る用）
   */
  useEffect(() => {
    if (!isValidYMD(pickupDate) || !isValidYMD(deliveryDate)) return;
    saveSessionDates({ pickupDate, deliveryDate, pickupTimeSlot: pickupTimeSlot as TimeSlot, deliveryTimeSlot: deliveryTimeSlot as TimeSlot });
  }, [pickupDate, deliveryDate, pickupTimeSlot, deliveryTimeSlot]);

  /**
   * ✅ 集荷日変更時の連動ロジック（ユーザー変更時のみ）
   * - お届け日が集荷日より前なら、お届け日を集荷日に自動補正
   */
  const isPickupDirty = !!formState.dirtyFields?.dates?.pickupDate;

  useEffect(() => {
    if (!isPickupDirty) return;
    if (!pickupDate || !deliveryDate) return;
    if (deliveryDate < pickupDate) {
      setValue('dates.deliveryDate', pickupDate, { shouldDirty: true });
    }
  }, [pickupDate, deliveryDate, setValue, isPickupDirty]);

  // 繁忙期チェック（集荷日またはお届け日のどちらかが繁忙期なら警告表示）
  const isPickupBusySeason = isBusySeason(pickupDate);
  const isDeliveryBusySeason = isBusySeason(deliveryDate);
  const isAnyBusySeason = isPickupBusySeason || isDeliveryBusySeason;

  // 積み置き日数計算
  const storageDays = calculateStorageDays({ pickupDate, deliveryDate });

  // 繁忙期料率（DBから取得、なければconfig.tsのフォールバック）
  const busySeasonRate = pricingSettings?.busy_season_rate ?? BUSY_SEASON_CONFIG.surchargeRate;
  const busySeasonStart = pricingSettings?.busy_season_start ?? BUSY_SEASON_CONFIG.startDate;
  const busySeasonEnd = pricingSettings?.busy_season_end ?? BUSY_SEASON_CONFIG.endDate;

  const onSubmit = (data: DateFormData) => {
    // Step1以降へ渡すための保存（これは残してOK）
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
      {/* 説明文 */}
      <p className="text-center text-gray-600 font-bold text-base">
        <AnimatedText text="まずは引越し予定日を教えてください！" />
      </p>
      {/* 集荷日程セクション */}
      <div className="pop-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DF0376] flex items-center justify-center border-[2px] border-black">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-black">集荷日程</h3>
          </div>
          <span className="badge-pink-no-border">PICKUP</span>
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
              onChange={(value) => {
                setValue('dates.pickupDate', value, { shouldDirty: true });
                trigger('dates.pickupDate');
              }}
              error={!!formState.errors.dates?.pickupDate}
            />
            {formState.errors.dates?.pickupDate && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {formState.errors.dates.pickupDate.message}
              </p>
            )}
          </div>

          {/* 集荷希望時間帯 */}
          <div className="space-y-2 pb-4">
            <Label htmlFor="pickup-time-slot" className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              集荷希望時間帯 <span className="text-[oklch(0.75_0.2_0)]">*</span>
            </Label>
            <select
              id="pickup-time-slot"
              value={pickupTimeSlot}
              onChange={(e) => setValue('dates.pickupTimeSlot', e.target.value as TimeSlot, { shouldDirty: true })}
              className={`pop-select ${formState.errors.dates?.pickupTimeSlot ? 'error' : ''}`}
            >
              <option value="">{timeSlotLabels['']}</option>
              <option value="anytime">{timeSlotLabels.anytime}</option>
              <option value="morning">{timeSlotLabels.morning}</option>
              <option value="afternoon">{timeSlotLabels.afternoon}</option>
            </select>
            {formState.errors.dates?.pickupTimeSlot && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {formState.errors.dates.pickupTimeSlot.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 矢印 */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-[3px] border-black">
          <ArrowDown className="w-6 h-6" />
        </div>
      </div>

      {/* お届け日程セクション */}
      <div className="pop-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5BB661] flex items-center justify-center border-[2px] border-black">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-black">お届け日程</h3>
          </div>
          <span className="badge-green-no-border">DELIVERY</span>
        </div>

        <div className="grid gap-6 max-w-md mx-auto">
          {/* お届け日 */}
          <div className="space-y-2">
            <Label htmlFor="delivery-date" className="font-bold">
              お届け日 <span className="text-[oklch(0.75_0.2_0)]">*</span>
            </Label>
            <DatePickerField
              id="delivery-date"
              value={deliveryDate}
              onChange={(value) => setValue('dates.deliveryDate', value, { shouldDirty: true })}
              error={!!formState.errors.dates?.deliveryDate}
            />
            {formState.errors.dates?.deliveryDate && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {formState.errors.dates.deliveryDate.message}
              </p>
            )}
          </div>

          {/* お届け希望時間帯 */}
          <div className="space-y-2 pb-4">
            <Label htmlFor="delivery-time-slot" className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              お届け希望時間帯 <span className="text-[oklch(0.75_0.2_0)]">*</span>
            </Label>
            <select
              id="delivery-time-slot"
              value={deliveryTimeSlot}
              onChange={(e) => setValue('dates.deliveryTimeSlot', e.target.value as TimeSlot, { shouldDirty: true })}
              className={`pop-select ${formState.errors.dates?.deliveryTimeSlot ? 'error' : ''}`}
            >
              <option value="">{timeSlotLabels['']}</option>
              <option value="anytime">{timeSlotLabels.anytime}</option>
              <option value="morning">{timeSlotLabels.morning}</option>
              <option value="afternoon">{timeSlotLabels.afternoon}</option>
            </select>
            {formState.errors.dates?.deliveryTimeSlot && (
              <p className="text-sm text-[oklch(0.75_0.2_0)] font-medium">
                {formState.errors.dates.deliveryTimeSlot.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="space-y-3">
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
        {isAnyBusySeason && (
          <div className="flex items-start gap-2 p-3 bg-[oklch(0.95_0.1_20)] rounded-xl border-2 border-[oklch(0.8_0.15_20)]">
            <AlertCircle className="w-5 h-5 text-[oklch(0.6_0.2_20)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[oklch(0.4_0.1_20)]">
              <span className="font-bold">繁忙期料金：</span>
              {busySeasonStart.replace('-', '/')}〜{busySeasonEnd.replace('-', '/')}は繁忙期のため、
              基本料金が{Math.round(busySeasonRate * 100)}%増しとなります。
            </p>
          </div>
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-center pt-4">
        <Button type="submit" className="pop-button max-w-[280px] h-14 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none">
          次へ進む
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </form>
  );
}