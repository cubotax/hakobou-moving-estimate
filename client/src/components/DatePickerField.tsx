/**
 * 日付ピッカーコンポーネント
 * - PC: Radix UI カレンダーコンポーネント
 * - モバイル: ネイティブHTML5 date input（ホイール型）
 */

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useMobile';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  error?: boolean;
}

export function DatePickerField({
  value,
  onChange,
  id,
  disabled,
  error,
}: DatePickerFieldProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dateValue = value ? new Date(value) : undefined;

  // クライアント側でのみレンダリング
  useEffect(() => {
    setMounted(true);
  }, []);

  // PC用：Radix UI カレンダーピッカー
  const renderCalendarPicker = () => (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between border-[2px] border-black rounded-xl h-12 px-4 font-bold text-base bg-white ${
            error ? 'border-[oklch(0.75_0.2_0)]' : ''
          }`}
          disabled={disabled}
        >
          <span className="text-left">
            {dateValue
              ? format(dateValue, 'yyyy年MM月dd日')
              : 'カレンダーから選択'}
          </span>
          <Calendar className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-[2px] border-black rounded-xl" align="start">
        <CalendarComponent
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
            }
            setIsOpen(false);
          }}
          disabled={disabled}
          className="rounded-xl"
        />
      </PopoverContent>
    </Popover>
  );

  // モバイル用：ネイティブ date input（ホイール型）
  const renderMobilePicker = () => (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`native-date-input w-full border-[2px] border-black rounded-xl h-12 px-4 font-bold text-base bg-white cursor-pointer ${
        error ? 'border-[oklch(0.75_0.2_0)]' : ''
      }`}
      style={{ colorScheme: 'light' }}
    />
  );

  // マウント時または判定後、モバイルならネイティブピッカー、PCならカレンダーを表示
  if (!mounted) {
    return renderMobilePicker(); // 初期レンダリングはモバイル優先
  }

  return isMobile ? renderMobilePicker() : renderCalendarPicker();
}
