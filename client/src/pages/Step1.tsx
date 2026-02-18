/**
 * Step1: 住所入力ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { Layout } from '@/components/Layout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AddressForm } from '@/components/AddressForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Truck, Sparkles } from 'lucide-react';

export default function Step1() {
  usePageTitle('住所入力');
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
              <picture>
                <source
                  srcSet="/mitsumori_logo-1x.webp 545w, /mitsumori_logo-2x.webp 1090w, /mitsumori_logo-3x.webp 1636w"
                  sizes="(max-width: 640px) 408px, 545px"
                  type="image/webp"
                />
                <img
                  src="/mitsumori_logo-fallback.png"
                  alt="ハコボウのオンライン見積"
                  className="h-auto w-[80%] sm:w-[400px] mx-auto"
                  width="545"
                  height="96"
                />
              </picture>
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
            <span className="text-sm">カンタンに距離がわかるよ</span>
            <Sparkles className="inline-block w-5 h-5 ml-2" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
