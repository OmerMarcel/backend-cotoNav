-- Table pour stocker les tokens FCM (Web / Mobile) par utilisateur
-- À exécuter dans le SQL Editor Supabase

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'web', -- web | android | ios | etc.
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_role ON user_fcm_tokens(role);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_fcm_tokens_updated_at'
  ) THEN
    CREATE TRIGGER update_user_fcm_tokens_updated_at
    BEFORE UPDATE ON user_fcm_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


