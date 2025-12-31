/**
 * ホイール型日付ピッカーコンポーネント
 * 
 * Design Philosophy: ポップ＆カジュアル
 * - ドラム式のスクロール選択UI
 * - 年・月・日を個別に選択
 * - スマホフレンドリーなタッチ操作
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WheelDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  className?: string;
}

interface WheelColumnProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onChange: (value: number) => void;
  itemHeight?: number;
}

function WheelColumn({ items, selectedValue, onChange, itemHeight = 44 }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  const selectedIndex = items.findIndex(item => item.value === selectedValue);

  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const targetScroll = selectedIndex * itemHeight;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [selectedIndex, itemHeight, isDragging]);

  const handleScroll = useCallback(() => {
    if (containerRef.current && !isDragging) {
      const scrollPosition = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollPosition / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));
      if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
        onChange(items[clampedIndex].value);
      }
    }
  }, [items, itemHeight, onChange, selectedValue, isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    scrollTop.current = containerRef.current?.scrollTop || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const deltaY = startY.current - e.touches[0].clientY;
    containerRef.current.scrollTop = scrollTop.current + deltaY;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (containerRef.current) {
      const scrollPosition = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollPosition / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      });
      if (items[clampedIndex]) {
        onChange(items[clampedIndex].value);
      }
    }
  };

  const handleItemClick = (value: number) => {
    onChange(value);
  };

  return (
    <div className="relative h-[220px] overflow-hidden">
      {/* 選択インジケーター */}
      <div 
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[44px] bg-[oklch(0.92_0.16_95)] border-y-2 border-black pointer-events-none z-10"
      />
      
      {/* グラデーションマスク */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-white via-transparent to-white" />
      
      {/* スクロールコンテナ */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          paddingTop: `${itemHeight * 2}px`, 
          paddingBottom: `${itemHeight * 2}px`,
          scrollSnapType: 'y mandatory'
        }}
      >
        {items.map((item) => (
          <div
            key={item.value}
            className={cn(
              'h-[44px] flex items-center justify-center cursor-pointer',
              'text-lg font-bold transition-all duration-200 snap-center',
              item.value === selectedValue 
                ? 'text-black scale-110' 
                : 'text-gray-400 scale-90'
            )}
            onClick={() => handleItemClick(item.value)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WheelDatePicker({ 
  value, 
  onChange, 
  minDate,
  maxDate,
  label,
  className 
}: WheelDatePickerProps) {
  const today = new Date();
  const defaultMinDate = minDate || today;
  const defaultMaxDate = maxDate || new Date(today.getFullYear() + 1, 11, 31);
  
  const currentDate = value || today;
  
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  // 年の選択肢を生成
  const years = [];
  for (let y = defaultMinDate.getFullYear(); y <= defaultMaxDate.getFullYear(); y++) {
    years.push({ value: y, label: `${y}年` });
  }

  // 月の選択肢を生成
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push({ value: m, label: `${m}月` });
  }

  // 日の選択肢を生成（月によって変動）
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ value: d, label: `${d}日` });
  }

  // 日が月の日数を超えている場合は調整
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedMonth, selectedYear, daysInMonth, selectedDay]);

  // 日付が変更されたら親に通知
  useEffect(() => {
    const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    
    // 最小日付チェック
    if (newDate < defaultMinDate) {
      setSelectedYear(defaultMinDate.getFullYear());
      setSelectedMonth(defaultMinDate.getMonth() + 1);
      setSelectedDay(defaultMinDate.getDate());
      return;
    }
    
    // 最大日付チェック
    if (newDate > defaultMaxDate) {
      setSelectedYear(defaultMaxDate.getFullYear());
      setSelectedMonth(defaultMaxDate.getMonth() + 1);
      setSelectedDay(defaultMaxDate.getDate());
      return;
    }
    
    onChange(newDate);
  }, [selectedYear, selectedMonth, selectedDay, onChange, defaultMinDate, defaultMaxDate]);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label} <span className="text-pink-500">*</span>
        </label>
      )}
      
      <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-3 gap-2">
          {/* 年 */}
          <WheelColumn
            items={years}
            selectedValue={selectedYear}
            onChange={setSelectedYear}
          />
          
          {/* 月 */}
          <WheelColumn
            items={months}
            selectedValue={selectedMonth}
            onChange={setSelectedMonth}
          />
          
          {/* 日 */}
          <WheelColumn
            items={days}
            selectedValue={selectedDay}
            onChange={setSelectedDay}
          />
        </div>
      </div>
    </div>
  );
}

export default WheelDatePicker;
