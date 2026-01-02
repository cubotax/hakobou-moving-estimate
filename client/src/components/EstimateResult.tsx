/**
 * 見積もり結果表示コンポーネント（Step3）
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 黄色背景で金額を際立たせる
 * - 黒枠カードで内訳を表示
 * - カラフルなアイコン
 * - 日付・繁忙期・積み置き情報の表示
 */

import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { 
  MapPin, 
  Truck, 
  Route, 
  Receipt,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  Sparkles,
  PartyPopper,
  Calendar,
  Clock,
  MessageCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  getStep1Data, 
  getDistanceData, 
  getEstimateResult,
  clearAllData 
} from '@/lib/store';
import { formatCurrency, formatDistance, isBusySeason } from '@/lib/pricing';
import { UI_DISPLAY_CONFIG, BUSY_SEASON_CONFIG } from '@/lib/config';
import type { Step1FormData } from '@/lib/schema';
import type { DistanceResult, EstimateResult as EstimateResultType } from '@/lib/types';

// 日付をフォーマット（YYYY-MM-DD → YYYY年MM月DD日）
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function EstimateResult() {
  const [, navigate] = useLocation();
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [distanceData, setDistanceData] = useState<DistanceResult | null>(null);
  const [estimateResult, setEstimateResult] = useState<EstimateResultType | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const s1 = getStep1Data();
    const dist = getDistanceData();
    const result = getEstimateResult();

    if (!s1 || !dist || !result) {
      navigate('/');
      return;
    }

    setStep1Data(s1);
    setDistanceData(dist);
    setEstimateResult(result);
  }, [navigate]);

  const handleStartOver = () => {
    clearAllData();
    navigate('/');
  };

  const handleGoBack = () => {
    navigate('/step2');
  };

  if (!step1Data || !distanceData || !estimateResult) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 見積もり結果ヘッダー */}
      <div className="pop-card bg-[oklch(0.92_0.16_95)] p-8 text-center relative overflow-hidden">
        {/* 背景装飾イラスト（数学的ミラー配置：左右完全対称 & 反転） */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
          {/* ペア1: 四隅上部 (Y:5%) */}
          <PartyPopper className="absolute top-[5%] left-[5%] w-14 h-14 -rotate-12" />
          <PartyPopper 
            className="absolute top-[5%] right-[5%] w-14 h-14 rotate-12" 
            style={{ transform: 'scaleX(-1)' }} 
          />
          
          {/* ペア2: 四隅下部 (Y:10%) */}
          <Sparkles className="absolute bottom-[10%] left-[8%] w-12 h-12 -rotate-12" />
          <Sparkles 
            className="absolute bottom-[10%] right-[8%] w-12 h-12 rotate-12" 
            style={{ transform: 'scaleX(-1)' }} 
          />

          {/* ペア3: 中央上部寄り左右 (Y:20%) */}
          <Sparkles className="absolute top-[20%] left-[12%] w-6 h-6 rotate-6" />
          <Sparkles 
            className="absolute top-[20%] right-[12%] w-6 h-6 -rotate-6" 
            style={{ transform: 'scaleX(-1)' }} 
          />

          {/* ペア4: ボタン上部左右 (Y:65%) */}
          <Sparkles className="absolute top-[65%] left-[15%] w-5 h-5 rotate-12" />
          <Sparkles 
            className="absolute top-[65%] right-[15%] w-5 h-5 -rotate-12" 
            style={{ transform: 'scaleX(-1)' }} 
          />
          
          {/* ペア5: 左右端中央 (Y:45%) */}
          <PartyPopper className="absolute top-[45%] left-[3%] w-8 h-8 -rotate-90" />
          <PartyPopper 
            className="absolute top-[45%] right-[3%] w-8 h-8 rotate-90" 
            style={{ transform: 'scaleX(-1)' }} 
          />
        </div>
        
        <div className="relative z-10">
          <p className="text-black/70 font-black mb-2 text-xl">お見積もり金額</p>
          <p className="text-5xl sm:text-6xl font-black text-black tracking-tight">
            {formatCurrency(estimateResult.totalFee)}
          </p>
          
          {/* 繁忙期バッジ */}
          {!!estimateResult.isBusySeason && (
            <div 
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[oklch(0.95_0.15_20)] rounded-full border-2"
              style={{ borderColor: BUSY_SEASON_CONFIG.busySeasonLabelBorderColor }}
            >
              <AlertCircle className="w-4 h-4 text-[oklch(0.5_0.2_20)]" />
              <span className="text-sm font-bold text-[oklch(0.4_0.15_20)]">繁忙期料金適用中</span>
            </div>
          )}
          
          <p className="text-black/60 text-sm mt-4 whitespace-pre-line font-bold">
            この金額をもとにLINEから{'\n'}お気軽にご相談いただけます！
          </p>

          {/* LINE相談ボタン */}
          <div className="mt-6">
            <a
              href="https://line.me/R/oaMessage/@your_line_official_account_id/?相談をはじめる"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-[#00B900] hover:bg-[#009D00] text-white font-black rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <MessageCircle className="w-5 h-5" />
              LINE で相談をはじめる
            </a>
          </div>
        </div>
      </div>

      {/* ご入力内容セクション */}
      <div className="px-6 py-8 text-center relative">
        {/* 装飾アイコン */}
        <div className="absolute top-4 left-8 opacity-30">
          <Sparkles className="w-6 h-6 text-[oklch(0.92_0.16_95)]" />
        </div>
        <div className="absolute top-4 right-8 opacity-30">
          <Sparkles className="w-6 h-6 text-[oklch(0.92_0.16_95)]" />
        </div>
        
        <h2 className="text-3xl font-black text-black inline-block relative">
          ご入力内容
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[oklch(0.92_0.16_95)] rounded-full" />
        </h2>
      </div>

      {/* 日程情報 */}
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.7_0.15_200)] flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">引越し日程</h3>
          <span className="badge-green-no-border ml-auto">DATE</span>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">集荷日</p>
            <p className="font-bold text-lg">{formatDate(step1Data.dates.pickupDate)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <p className="text-sm text-gray-500 font-medium mb-1">お届け日</p>
            <p className="font-bold text-lg">{formatDate(step1Data.dates.deliveryDate)}</p>
          </div>
        </div>
        
        {/* 積み置き日数の表示 */}
        {!!estimateResult.storageDays && estimateResult.storageDays > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-[oklch(0.95_0.05_80)] rounded-xl border-2 border-[oklch(0.8_0.1_80)]">
            <Clock className="w-5 h-5 text-[oklch(0.6_0.15_80)]" />
            <span className="font-medium text-[oklch(0.4_0.05_80)]">
              積み置き期間: {estimateResult.storageDays}日間
            </span>
          </div>
        )}
      </div>

      {/* ルート情報 */}
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.7_0.15_250)] flex items-center justify-center">
            <Route className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">ルート情報</h3>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[oklch(0.75_0.2_0)] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="w-1 h-8 bg-black my-1 rounded-full" />
            <div className="w-10 h-10 rounded-full bg-[oklch(0.75_0.2_145)] flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">集荷先</p>
              <p className="font-bold text-lg">
                {step1Data.pickupAddress.prefecture} {step1Data.pickupAddress.city} {step1Data.pickupAddress.town}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">お届け先</p>
              <p className="font-bold text-lg">
                {step1Data.deliveryAddress.prefecture} {step1Data.deliveryAddress.city} {step1Data.deliveryAddress.town}
              </p>
            </div>
          </div>
        </div>
        
        <Separator className="my-6 border-t-2 border-dashed border-gray-300" />
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">走行距離</span>
          <span className="text-2xl font-black">
            {formatDistance(estimateResult.distanceKm)}
          </span>
        </div>
        
        {!!estimateResult.isInterPrefecture && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 rounded-xl p-3 mt-4 border-2 border-dashed border-gray-300">
            <AlertCircle className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-600">県外への引越しです</span>
          </div>
        )}
      </div>

      {/* 料金内訳 */}
      <div className="pop-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.8_0.18_60)] flex items-center justify-center border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-black">料金内訳</h3>
        </div>
        
        <div className="space-y-4">
          {estimateResult.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between items-start py-2 border-b-2 border-dashed border-gray-200 last:border-0">
              <div>
                <p className="font-bold">{item.name}</p>
                {!!item.note && (
                  <p className="text-sm text-gray-500">{item.note}</p>
                )}
              </div>
              <span className="font-black text-lg whitespace-nowrap ml-4">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          
          {estimateResult.breakdown.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              追加料金はありません
            </p>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-[oklch(0.92_0.16_95)] rounded-xl border-[3px] border-black">
          <div className="flex justify-between items-center">
            <span className="text-lg font-black">合計</span>
            <span className="text-3xl font-black">
              {formatCurrency(estimateResult.totalFee)}
            </span>
          </div>
        </div>

        {/* 繁忙期メッセージ */}
        {isBusySeason(step1Data.dates.pickupDate) && (
          <div 
            className="mt-4 p-4 bg-[oklch(0.95_0.15_20)] border-2 rounded-xl"
            style={{ borderColor: BUSY_SEASON_CONFIG.busySeasonLabelBorderColor }}
          >
            <p className="text-sm font-bold text-[oklch(0.4_0.15_20)] flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>
                繁忙期（{BUSY_SEASON_CONFIG.startDate.replace('-', '/')}〜{BUSY_SEASON_CONFIG.endDate.replace('-', '/')}）のため、基本料金が{BUSY_SEASON_CONFIG.surchargeRate * 100}%増しとなっております。
              </span>
            </p>
          </div>
        )}

        {/* 積み置き料金メッセージ (表示フラグ制御) */}
        {UI_DISPLAY_CONFIG.SHOW_TSUMIOKI_MESSAGE && (
          <div className="mt-4 p-4 bg-[oklch(0.95_0.05_95)] border-2 border-[oklch(0.8_0.18_60)] rounded-xl">
            <p className="text-sm font-medium text-[oklch(0.5_0.1_60)] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              積み置き料金に関する注意メッセージ（将来表示用）
            </p>
          </div>
        )}

        {!!estimateResult.highwayFeeNote && (
          <div className="mt-4 p-4 bg-[oklch(0.95_0.05_95)] border-2 border-[oklch(0.8_0.18_60)] rounded-xl">
            <p className="text-sm font-medium text-[oklch(0.5_0.1_60)] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              高速道路料金: {estimateResult.highwayFeeNote}
            </p>
          </div>
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoBack}
          className="h-14 flex-1 border-[3px] border-black rounded-xl font-bold text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all bg-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          条件を変更
        </Button>
        <Button
          type="button"
          onClick={handleStartOver}
          className="pop-button h-14 flex-1 text-base font-bold"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          最初からやり直す
        </Button>
      </div>
    </div>
  );
}
