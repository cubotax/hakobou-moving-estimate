/**
 * Step2: 条件入力ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { ConditionForm } from '@/components/ConditionForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Settings, Sparkles } from 'lucide-react';

export default function Step2() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="badge-orange">ステップ3</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black mb-4 relative text-center">
            <div>
              <span>ハコボウの</span><br />
              <span>引越し見積</span>
            </div>
            <Settings className="inline-block w-10 h-10 mt-2 text-[oklch(0.8_0.18_60)]" />
          </h1>
          <p className="text-gray-600 text-lg">
            引越しの条件を教えてください！
          </p>
        </header>

        {/* ステップインジケーター */}
        <div className="max-w-3xl mx-auto mb-8">
          <StepIndicator steps={ESTIMATE_STEPS} currentStep={3} />
        </div>

        {/* フォーム */}
        <div className="max-w-2xl mx-auto">
          <ConditionForm />
        </div>
        
        {/* フッター装飾 */}
        <div className="text-center mt-12 text-gray-400">
          <Sparkles className="inline-block w-5 h-5 mr-2" />
          <span className="text-sm">あと少しで完了です</span>
          <Sparkles className="inline-block w-5 h-5 ml-2" />
        </div>
      </div>
    </div>
  );
}
