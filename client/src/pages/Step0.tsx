/**
 * Step0: 引越し日程ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { DateForm } from '@/components/DateForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Truck } from 'lucide-react';

export default function Step0() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="badge-pink">カンタン</span>
            <span className="badge-yellow">3ステップ</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black mb-4 relative inline-block">
            <span className="hand-underline">引越し見積もり</span>
            <Truck className="inline-block w-10 h-10 ml-3 -mt-2 text-[oklch(0.75_0.2_145)]" />
          </h1>
          <p className="text-gray-600 text-lg">
            住所を入力するだけで、すぐに概算料金がわかります！
          </p>
        </header>

        {/* ステップインジケーター */}
        <div className="max-w-3xl mx-auto mb-8">
          <StepIndicator steps={ESTIMATE_STEPS} currentStep={0} />
        </div>

        {/* フォーム */}
        <div className="max-w-2xl mx-auto">
          <DateForm />
        </div>
        
        {/* フッター装飾 */}
        <div className="text-center mt-12 text-gray-400">
          <span className="text-sm">見積もりは無料です</span>
        </div>
      </div>
    </div>
  );
}
