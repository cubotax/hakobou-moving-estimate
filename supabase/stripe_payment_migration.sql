-- Stripe決済連携用カラム追加
-- Supabase SQL Editorで実行してください

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- インデックス追加（オプション）
CREATE INDEX IF NOT EXISTS idx_estimates_stripe_session_id ON estimates(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_estimates_payment_status ON estimates(payment_status);
