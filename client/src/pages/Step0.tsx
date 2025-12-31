/**
 * Step0: 引越し日程ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { DateForm } from '@/components/DateForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Calendar, Sparkles } from 'lucide-react';

export default function Step0() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="badge-green">ステップ1</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black mb-4 relative inline-block">
            <span className="hand-underline">引越し見積もり</span>
            <Calendar className="inline-block w-10 h-10 ml-3 -mt-2 text-[oklch(0.7_0.15_200)]" />
          </h1>
          <p className="text-gray-600 text-lg">
            引越しの日程を教えてください！
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
          <Sparkles className="inline-block w-5 h-5 mr-2" />
          <span className="text-sm">簡単3ステップで完了！</span>
          <Sparkles className="inline-block w-5 h-5 ml-2" />
        </div>
      </div>
    </div>
  );
}
