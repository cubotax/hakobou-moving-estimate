/**
 * Step1: 住所入力ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { Layout } from '@/components/Layout';
import { AddressForm } from '@/components/AddressForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Truck, Sparkles } from 'lucide-react';

export default function Step1() {
  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-white">
        <div className="container py-8 sm:py-12">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="badge-pink">ステップ2</span>
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
    </Layout>
  );
}
