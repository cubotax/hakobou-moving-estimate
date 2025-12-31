/**
 * Step1: 住所入力ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { AddressForm } from '@/components/AddressForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Truck, Sparkles } from 'lucide-react';

export default function Step1() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="badge-pink">ステップ2</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-black mb-4 relative text-center">
            <div>
              <span>ハコボウの</span><br />
              <span>オンライン見積</span>
            </div>
            <Truck className="inline-block w-10 h-10 mt-2 text-[oklch(0.75_0.2_145)]" />
          </h1>
          <p className="text-gray-600 text-base sm:text-lg px-4">
            住所を入力してください！
          </p>
        </header>

        {/* ステップインジケーター */}
        <div className="max-w-3xl mx-auto mb-8">
          <StepIndicator steps={ESTIMATE_STEPS} currentStep={2} />
        </div>

        {/* フォーム */}
        <div className="max-w-2xl mx-auto">
          <AddressForm />
        </div>
        
        {/* フッター装飾 */}
        <div className="text-center mt-12 text-gray-400">
          <Sparkles className="inline-block w-5 h-5 mr-2" />
          <span className="text-sm">見積もりは無料です</span>
          <Sparkles className="inline-block w-5 h-5 ml-2" />
        </div>
      </div>
    </div>
  );
}
