/**
 * 日付ピッカーコンポーネント
 * - すべてのデバイスで: ネイティブHTML5 date input（ホイール型）
 */

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
  return (
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
}
