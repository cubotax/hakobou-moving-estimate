-- =====================================================
-- 名前カラム追加マイグレーション
-- Supabase SQL Editorで実行してください
-- =====================================================

-- 姓
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 名
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS first_name TEXT;

-- せい（ふりがな）
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS last_name_kana TEXT;

-- めい（ふりがな）
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS first_name_kana TEXT;
