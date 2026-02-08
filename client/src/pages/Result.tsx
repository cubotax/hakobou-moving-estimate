/**
 * Step3: 見積もり結果ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { Layout } from '@/components/Layout';
import { EstimateResult } from '@/components/EstimateResult';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Calculator, PartyPopper } from 'lucide-react';

export default function Result() {
  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-white">
        <div className="container py-8 sm:py-12">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="badge-green">完了！</span>
            </div>
            <div className="mb-4 text-center">
              <img
                src="/mitsumori_logo.png"
                alt="ハコボウのオンライン見積"
                className="h-18 sm:h-24 mx-auto"
              />
            </div>
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
    </Layout>
  );
}
