-- =====================================================
-- 調整値カラム追加マイグレーション
-- Supabase SQL Editorで実行してください
-- =====================================================

-- 調整後の日程
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_pickup_date TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_delivery_date TEXT;

-- 調整後のプラン・オプション
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_plan TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_needs_packing BOOLEAN;

-- 調整後の集荷先条件
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_floor_pickup INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_has_elevator_pickup BOOLEAN;

-- 調整後のお届け先条件
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_floor_delivery INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_has_elevator_delivery BOOLEAN;

-- 調整履歴用
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS adjusted_by TEXT;
