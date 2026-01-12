import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 全角英数字・記号を半角に変換する
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    })
    .replace(/　/g, " ")
    .replace(/[ー－―‐]/g, "-");
}

/**
 * 郵便番号をフォーマット（全角→半角、ハイフン統一、数字以外除去）
 */
export function formatPostalCode(str: string): string {
  const half = toHalfWidth(str);
  return half.replace(/[^0-9-]/g, "");
}
