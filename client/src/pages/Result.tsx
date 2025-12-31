/**
 * Step3: 見積もり結果ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { EstimateResult } from '@/components/EstimateResult';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Calculator, PartyPopper } from 'lucide-react';

export default function Result() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="badge-green">完了！</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black mb-4 relative text-center">
            <span>オンライン見積</span>
            <PartyPopper className="inline-block w-10 h-10 ml-3 -mt-2 text-[oklch(0.92_0.16_95)]" />
          </h1>
          <p className="text-gray-600 text-lg">
            お見積もり結果はこちら！
          </p>
        </header>

        {/* ステップインジケーター */}
        <div className="max-w-3xl mx-auto mb-8">
          <StepIndicator steps={ESTIMATE_STEPS} currentStep={4} />
        </div>

        {/* ステップ完了バッジ */}
        <style>{`
          @media (max-width: 639px) {
            .step-label {
              font-size: 0.875rem;
            }
          }
        `}</style>

        {/* 結果 */}
        <div className="max-w-2xl mx-auto">
          <EstimateResult />
        </div>
      </div>
    </div>
  );
}
