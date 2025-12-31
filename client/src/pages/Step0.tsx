/**
 * Step0: 引越し日程ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { DateForm } from '@/components/DateForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';

export default function Step0() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ステップインジケーター */}
        <div className="max-w-3xl mx-auto mb-8">
          <StepIndicator steps={ESTIMATE_STEPS} currentStep={0} />
        </div>

        {/* フォーム */}
        <div className="max-w-2xl mx-auto">
          <DateForm />
        </div>
      </div>
    </div>
  );
}
