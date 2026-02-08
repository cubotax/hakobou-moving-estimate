/**
 * Step2: 条件入力ページ
 * 
 * Design Philosophy: ポップ＆カジュアル
 */

import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { ConditionForm } from '@/components/ConditionForm';
import { StepIndicator, ESTIMATE_STEPS } from '@/components/StepIndicator';
import { Settings, Sparkles } from 'lucide-react';

// タイピングアニメーションコンポーネント（改行対応）
const AnimatedText = ({ lines }: { lines: string[] }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const fullText = lines.join('\n');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    setIsComplete(false);

    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [fullText]);

  return (
    <span>
      {displayedText.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < displayedText.split('\n').length - 1 && <br />}
        </span>
      ))}
      {!isComplete && <span className="typing-cursor">|</span>}
    </span>
  );
};

export default function Step2() {
  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-white">
        <div className="container py-8 sm:py-12">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="badge-pink">ステップ3</span>
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
          </header>

          {/* ステップインジケーター */}
          <div className="max-w-3xl mx-auto mb-8">
            <StepIndicator steps={ESTIMATE_STEPS} currentStep={3} />
          </div>

          {/* フォーム */}
          <div className="max-w-2xl mx-auto">
            <ConditionForm />
          </div>
          {/* フッター */}
          <footer className="text-center mt-12 pb-8">
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              あと少しで完了です
              <Sparkles className="w-4 h-4" />
            </p>
          </footer>
        </div>
      </div>
    </Layout>
  );
}
