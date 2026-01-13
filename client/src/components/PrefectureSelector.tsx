/**
 * 都道府県セレクターコンポーネント
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - 黒枠のセレクトボックス
 * - 丸みのあるデザイン
 * - 入力済みの場合はチェックマークを表示
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PREFECTURES } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface PrefectureSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function PrefectureSelector({
  value,
  onValueChange,
  placeholder = '都道府県を選択',
  disabled = false,
  className,
  error = false,
}: PrefectureSelectorProps) {
  const hasValue = !!value;

  return (
    <div className="relative">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            'w-full h-12 border-[2px] border-black rounded-xl text-base font-medium',
            'focus:ring-[oklch(0.92_0.16_95)] focus:border-black',
            'data-[placeholder]:text-gray-400',
            hasValue && 'pr-10',
            error && 'border-[oklch(0.75_0.2_0)]',
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-[2px] border-black rounded-xl max-h-[300px]">
          {PREFECTURES.map((prefecture) => (
            <SelectItem
              key={prefecture}
              value={prefecture}
              className="text-base font-medium cursor-pointer hover:bg-[oklch(0.92_0.16_95)] focus:bg-[oklch(0.92_0.16_95)]"
            >
              {prefecture}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasValue && (
        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.5_0.15_145)] pointer-events-none" />
      )}
    </div>
  );
}
