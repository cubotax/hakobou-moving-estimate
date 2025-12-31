/**
 * ステップインジケーターコンポーネント
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 黒枠の丸いステップ番号
 * - 黄色でアクティブ表示
 * - グリーンで完了表示
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full py-4', className)}>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {/* ステップ番号/チェックマーク */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center',
                    'font-black text-lg sm:text-xl border-[3px] border-black',
                    'transition-all duration-300',
                    isCompleted && 'bg-[oklch(0.75_0.2_145)] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                    isCurrent && 'bg-[oklch(0.92_0.16_95)] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-110',
                    isPending && 'bg-white text-gray-300'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                
                {/* ステップタイトル */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      'text-sm sm:text-base font-bold transition-colors duration-300',
                      isCurrent && 'text-black',
                      isCompleted && 'text-[oklch(0.75_0.2_145)]',
                      isPending && 'text-gray-400'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p 
                      className={cn(
                        'text-xs sm:text-sm mt-1 hidden sm:block',
                        (isCurrent || isCompleted) ? 'text-gray-600' : 'text-gray-400'
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* 接続線 */}
              {index < steps.length - 1 && (
                <div className="flex items-center mx-2 sm:mx-4 -mt-8">
                  <div
                    className={cn(
                      'w-8 sm:w-16 h-1 rounded-full border-2 border-black',
                      'transition-all duration-300',
                      isCompleted ? 'bg-[oklch(0.75_0.2_145)]' : 'bg-gray-200'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ステップ定義
export const ESTIMATE_STEPS: Step[] = [
  {
    id: 0,
    title: '引越し日程',
    description: '集荷日・お届け日',
  },
  {
    id: 1,
    title: '住所入力',
    description: '集荷先・お届け先',
  },
  {
    id: 2,
    title: '条件入力',
    description: 'オプション選択',
  },
  {
    id: 3,
    title: '見積結果',
    description: '料金確認',
  },
];
