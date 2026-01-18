-- =====================================================
-- ハコボウ管理画面用 DBスキーマ
-- Supabase SQL Editorで実行してください
-- =====================================================

-- =====================================================
-- 1. coupons テーブル（クーポン管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,           -- クーポンコード（大文字で保存）
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value INTEGER NOT NULL,     -- 割引値（fixedは円、percentageは%）
  min_amount INTEGER NOT NULL DEFAULT 0, -- 最低利用金額
  start_date DATE,                     -- 開始日（NULLで常時）
  end_date DATE,                       -- 終了日（NULLで常時）
  usage_limit INTEGER,                 -- 利用回数上限（NULLで無制限）
  once_per_user BOOLEAN DEFAULT TRUE,  -- 1人1回制限
  is_active BOOLEAN DEFAULT TRUE,      -- 有効/無効
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- クーポンコードのインデックス（検索用）
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- =====================================================
-- 2. coupon_usages テーブル（クーポン利用履歴）
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  original_amount INTEGER NOT NULL,    -- 元の金額
  discount_amount INTEGER NOT NULL,    -- 割引額
  final_amount INTEGER NOT NULL,       -- 最終金額
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- クーポン利用履歴のインデックス
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_estimate_id ON coupon_usages(estimate_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_line_user_id ON coupon_usages(line_user_id);

-- =====================================================
-- 3. admin_memos テーブル（管理者メモ）
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_memos (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,            -- Googleアカウントのメールアドレス
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- メモのインデックス
CREATE INDEX IF NOT EXISTS idx_admin_memos_estimate_id ON admin_memos(estimate_id);

-- =====================================================
-- 4. message_logs テーブル（送信履歴）
-- =====================================================
CREATE TABLE IF NOT EXISTS message_logs (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('estimate', 'invite', 'payment')),
  sent_by TEXT,                        -- 送信者（自動の場合はNULL）
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 送信履歴のインデックス
CREATE INDEX IF NOT EXISTS idx_message_logs_estimate_id ON message_logs(estimate_id);

-- =====================================================
-- 5. estimates テーブルへのカラム追加
-- =====================================================
-- 最終金額（金額変更後の金額）
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS final_fee INTEGER;

-- 金額変更理由
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS fee_change_reason TEXT;

-- 使用したクーポンコード
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 割引額
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_amount INTEGER;

-- =====================================================
-- 6. RLS（Row Level Security）ポリシー
-- =====================================================
-- coupons テーブル
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on coupons" ON coupons
  FOR ALL USING (true) WITH CHECK (true);

-- coupon_usages テーブル
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on coupon_usages" ON coupon_usages
  FOR ALL USING (true) WITH CHECK (true);

-- admin_memos テーブル
ALTER TABLE admin_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on admin_memos" ON admin_memos
  FOR ALL USING (true) WITH CHECK (true);

-- message_logs テーブル
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on message_logs" ON message_logs
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 7. updated_at自動更新トリガー（couponsテーブル用）
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
