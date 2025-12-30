/**
 * Home ページ - Step1 へリダイレクト
 * 
 * このファイルは互換性のために残していますが、
 * 実際のルーティングは App.tsx で "/" -> Step1 に設定されています。
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function Home() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/');
  }, [navigate]);

  return null;
}
