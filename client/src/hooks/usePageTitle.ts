import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title}｜ハコボウ` : 'ハコボウ｜単身引越し専門でオンライン見積可能';
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
