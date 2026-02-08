/**
 * Step0: 引越し日程ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { Layout } from '@/components/Layout';
import { DateForm } from '@/components/DateForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Truck, Sparkles } from 'lucide-react';

export default function Step0() {
  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-white">
        <div className="container py-8 sm:py-12">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="badge-pink">カンタン</span>
              <span className="badge-yellow">無料</span>
              <span className="badge-blue">3ステップ</span>
            </div>
            <div className="mb-4 text-center">
              <picture>
                <source
                  srcSet="/mitsumori_logo-1x.webp 545w, /mitsumori_logo-2x.webp 1090w, /mitsumori_logo-3x.webp 1636w"
                  sizes="(max-width: 640px) 408px, 545px"
                  type="image/webp"
                />
                <img
                  src="/mitsumori_logo-fallback.png"
                  alt="ハコボウのオンライン見積"
                  className="h-18 sm:h-24 mx-auto"
                  width="545"
                  height="96"
                />
              </picture>
            </div>
            <p className="text-gray-600 text-base sm:text-lg px-4">
              住所と条件を入力するだけで<br />
              すぐに概算料金がわかる！
            </p>
          </header>

          {/* ステップインジケーター */}
          <div className="max-w-3xl mx-auto mb-8">
            <StepIndicator steps={ESTIMATE_STEPS} currentStep={1} />
          </div>

          {/* フォーム */}
          <div className="max-w-2xl mx-auto">
            <DateForm />
          </div>

          {/* フッター装飾 */}
          <div className="text-center mt-12 text-gray-400">
            <Sparkles className="inline-block w-5 h-5 mr-2" />
            <span className="text-sm">さぁ、見積もりスタート</span>
            <Sparkles className="inline-block w-5 h-5 ml-2" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
