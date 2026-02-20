-- Migration: Systeme d'echange de points en argent
-- Executer ce fichier complet dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reward_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_exchanged INT NOT NULL CHECK (points_exchanged > 0),
    amount_cfa NUMERIC(12, 2) NOT NULL CHECK (amount_cfa >= 0),
    rate_per_point NUMERIC(10, 4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reward_exchanges_user_date ON reward_exchanges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_exchanges_status ON reward_exchanges(status);

CREATE OR REPLACE FUNCTION request_points_exchange(
    p_user_id UUID,
    p_points INT,
    p_rate NUMERIC,
    p_min_points INT
) RETURNS JSONB AS $$
DECLARE
    new_total_points INT;
    exchange_id UUID;
    amount NUMERIC(12, 2);
BEGIN
    IF p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'points_invalid';
    END IF;

    IF p_min_points IS NULL OR p_min_points <= 0 THEN
        RAISE EXCEPTION 'min_points_invalid';
    END IF;

    IF p_points < p_min_points THEN
        RAISE EXCEPTION 'minimum_points_not_met';
    END IF;

    IF p_rate IS NULL OR p_rate <= 0 THEN
        RAISE EXCEPTION 'rate_invalid';
    END IF;

    UPDATE users
    SET total_points = total_points - p_points
    WHERE id = p_user_id AND total_points >= p_points
    RETURNING total_points INTO new_total_points;

    IF new_total_points IS NULL THEN
        RAISE EXCEPTION 'insufficient_points';
    END IF;

    amount := ROUND(p_points * p_rate, 2);

    INSERT INTO reward_exchanges (user_id, points_exchanged, amount_cfa, rate_per_point, status, processed_at, details)
    VALUES (p_user_id, p_points, amount, p_rate, 'completed', NOW(), jsonb_build_object('auto', true))
    RETURNING id INTO exchange_id;

    RETURN jsonb_build_object(
        'exchange_id', exchange_id,
        'points_exchanged', p_points,
        'amount_cfa', amount,
        'rate_per_point', p_rate,
        'status', 'completed',
        'new_total_points', new_total_points
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE reward_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs echanges" ON reward_exchanges FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins voient tous les echanges" ON reward_exchanges FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin') AND users.actif = true
    )
);

CREATE POLICY "Systeme insere les echanges" ON reward_exchanges FOR INSERT WITH CHECK (true);
