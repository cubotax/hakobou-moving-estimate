-- =====================================================
-- Phase 1: ステータス管理用カラム追加マイグレーション
-- Supabase SQL Editorで実行してください
-- =====================================================

-- 相談ボタン押下日時
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS consulted_at TIMESTAMPTZ;

-- 申込案内送信日時
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS application_sent_at TIMESTAMPTZ;

-- 決済案内送信日時
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMPTZ;

-- 決済完了日時
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- キャンセル日時
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- キャンセル理由
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- =====================================================
-- インデックス（ステータス検索の高速化）
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_consulted_at ON estimates(consulted_at);
CREATE INDEX IF NOT EXISTS idx_estimates_applied_at ON estimates(applied_at);
