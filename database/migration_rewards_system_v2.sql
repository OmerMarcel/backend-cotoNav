-- ============================================
-- MIGRATION: Système de Récompense v2
-- ============================================
-- Ce script ajoute toutes les tables et colonnes nécessaires
-- pour le système de points, niveaux et badges
-- Il est idempotent et peut être exécuté plusieurs fois sans erreur
-- 
-- STRUCTURE EXISTANTE PRESERVÉE:
-- - Table 'propositions' : propositions d'infrastructures
-- - Table 'avis' : avis utilisateurs  
-- - Table 'signalements' : signalements de problèmes
-- - Colonne 'contributions' JSONB dans 'users' : compteurs de base
--
-- NOUVELLES TABLES:
-- - 'reward_contributions' : historique détaillé des actions récompensées
-- - 'levels' : niveaux et seuils de points
-- - 'badges' : badges disponibles et critères
--
-- NOUVELLES COLONNES DANS 'users':
-- - total_points : total des points accumulés
-- - current_level : niveau actuel de l'utilisateur
-- - last_level_up_date : date du dernier changement de niveau
-- - badges_json : badges obtenus ({"badge_code": "date_obtention"})

-- ============================================
-- 1. MODIFICATION TABLE USERS
-- ============================================

DO $$
BEGIN
    -- Ajouter total_points
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'total_points'
    ) THEN
        ALTER TABLE users ADD COLUMN total_points INT DEFAULT 0;
        RAISE NOTICE 'Colonne total_points ajoutée à users';
    END IF;

    -- Ajouter current_level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'current_level'
    ) THEN
        ALTER TABLE users ADD COLUMN current_level INT DEFAULT 1;
        RAISE NOTICE 'Colonne current_level ajoutée à users';
    END IF;

    -- Ajouter last_level_up_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_level_up_date'
    ) THEN
        ALTER TABLE users ADD COLUMN last_level_up_date TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Colonne last_level_up_date ajoutée à users';
    END IF;

    -- Ajouter badges_json
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'badges_json'
    ) THEN
        ALTER TABLE users ADD COLUMN badges_json JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Colonne badges_json ajoutée à users';
    END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_total_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_level ON users(current_level);
CREATE INDEX IF NOT EXISTS idx_users_badges ON users USING GIN (badges_json);

-- ============================================
-- 2. TABLE REWARD_CONTRIBUTIONS
-- ============================================
-- Trace TOUTES les actions récompensées (avis, photos, propositions, etc.)

CREATE TABLE IF NOT EXISTS reward_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_type VARCHAR(50) NOT NULL CHECK (contribution_type IN (
        'avis',              -- Avis laissé sur une infrastructure
        'photo',             -- Photo ajoutée
        'video',             -- Vidéo ajoutée
        'vote_utile',        -- Vote "utile" sur un avis
        'reponse',           -- Réponse à un avis
        'proposition',       -- Proposition d'infrastructure (→ table propositions)
        'signalement',       -- Signalement de problème (→ table signalements)
        'avis_detaille'      -- Avis de plus de 200 caractères (bonus)
    )),
    points_awarded INT NOT NULL,
    contribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    related_entity_id UUID NULL, -- ID dans la table correspondante
    details JSONB DEFAULT '{}'::jsonb, -- Détails supplémentaires
    CONSTRAINT reward_contributions_points_positive CHECK (points_awarded >= 0)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reward_contributions_user ON reward_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_contributions_type ON reward_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_reward_contributions_date ON reward_contributions(contribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_reward_contributions_entity ON reward_contributions(related_entity_id);
CREATE INDEX IF NOT EXISTS idx_reward_contributions_user_date ON reward_contributions(user_id, contribution_date DESC);

-- ============================================
-- 3. TABLE LEVELS (Niveaux)
-- ============================================

CREATE TABLE IF NOT EXISTS levels (
    level_id INT PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL,
    points_required INT NOT NULL UNIQUE,
    description TEXT,
    badge_icon TEXT,
    CONSTRAINT levels_points_positive CHECK (points_required >= 0)
);

-- Données des niveaux
INSERT INTO levels (level_id, level_name, points_required, description)
VALUES
    (1, 'Novice', 0, 'Bienvenue dans CotoNav ! Commencez à explorer et contribuer.'),
    (2, 'Explorateur', 50, 'Vous commencez à bien connaître Cotonou !'),
    (3, 'Contributeur', 150, 'Vos contributions sont précieuses pour la communauté.'),
    (4, 'Expert Local', 300, 'Vous êtes une référence pour votre quartier !'),
    (5, 'Maître', 500, 'Votre connaissance de Cotonou est impressionnante !'),
    (6, 'Légende', 800, 'Vous êtes une véritable légende de CotoNav !'),
    (7, 'Ambassadeur', 1200, 'Ambassadeur officiel de CotoNav et de Cotonou !'),
    (8, 'Champion', 1800, 'Champion incontesté de la communauté !'),
    (9, 'Titan', 2500, 'Titan de la contribution citoyenne !'),
    (10, 'Héros de Cotonou', 3500, 'Le héros dont Cotonou a besoin !')
ON CONFLICT (level_id) DO NOTHING;

-- ============================================
-- 4. TABLE BADGES
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
    badge_code VARCHAR(50) PRIMARY KEY,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_icon TEXT,
    criteria_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Données des badges
INSERT INTO badges (badge_code, badge_name, description, criteria_json)
VALUES
    ('premier_pas', 'Premier Pas', 'A laissé son premier avis', '{"type": "avis", "count": 1}'),
    ('photographe', 'Photographe', 'A publié 20 photos', '{"type": "photo", "count": 20}'),
    ('critique_eclaire', 'Critique Éclairé', 'A publié 10 avis détaillés (>200 caractères)', '{"type": "avis_detaille", "count": 10}'),
    ('explorateur_ardent', 'Explorateur Ardent', 'A visité et évalué 50 lieux différents', '{"type": "avis", "count": 50, "unique_places": true}'),
    ('videaste', 'Vidéaste', 'A partagé 5 vidéos', '{"type": "video", "count": 5}'),
    ('citoyen_engage', 'Citoyen Engagé', 'A fait 10 signalements', '{"type": "signalement", "count": 10}'),
    ('contributeur_actif', 'Contributeur Actif', 'A proposé 5 nouvelles infrastructures', '{"type": "proposition", "count": 5}'),
    ('expert_quartier', 'Expert du Quartier', 'A contribué 100 fois dans sa zone', '{"type": "zone_contributions", "count": 100}'),
    ('marathonien', 'Marathonien', 'A contribué pendant 30 jours consécutifs', '{"type": "streak", "days": 30}'),
    ('influenceur', 'Influenceur', 'Ses avis ont reçu 100 votes utiles', '{"type": "vote_utile", "count": 100}')
ON CONFLICT (badge_code) DO NOTHING;

-- ============================================
-- 5. FONCTION: Calculer les points
-- ============================================

CREATE OR REPLACE FUNCTION calculate_contribution_points(
    p_contribution_type VARCHAR(50),
    p_details JSONB
) RETURNS INT AS $$
DECLARE
    points INT := 0;
BEGIN
    CASE p_contribution_type
        WHEN 'avis' THEN
            points := 10;
            -- Bonus pour avis détaillé (>200 caractères)
            IF (p_details->>'character_count')::INT > 200 THEN
                points := points + 10;
            END IF;
        WHEN 'photo' THEN
            points := 5;
            IF p_details->>'quality' = 'high' THEN
                points := points + 3;
            END IF;
        WHEN 'video' THEN
            points := 15;
        WHEN 'vote_utile' THEN
            points := 1;
        WHEN 'reponse' THEN
            points := 3;
        WHEN 'proposition' THEN
            points := 20;
        WHEN 'signalement' THEN
            points := 8;
        WHEN 'avis_detaille' THEN
            points := 20;
        ELSE
            points := 0;
    END CASE;
    
    RETURN points;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FONCTION: Vérifier et attribuer les badges
-- ============================================

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_badges JSONB;
    badge_record RECORD;
    contribution_count INT;
    new_badges JSONB := '[]'::jsonb;
BEGIN
    -- Récupérer les badges actuels
    SELECT badges_json INTO user_badges
    FROM users
    WHERE id = p_user_id;
    
    -- Parcourir tous les badges actifs
    FOR badge_record IN 
        SELECT * FROM badges WHERE is_active = true
    LOOP
        -- Vérifier si le badge n'est pas déjà obtenu
        IF NOT (user_badges ? badge_record.badge_code) THEN
            -- Vérifier les critères selon le type
            CASE badge_record.criteria_json->>'type'
                WHEN 'avis' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'avis';
                    
                WHEN 'avis_detaille' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'avis'
                    AND (details->>'character_count')::INT > 200;
                    
                WHEN 'photo' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'photo';
                    
                WHEN 'video' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'video';
                    
                WHEN 'signalement' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'signalement';
                    
                WHEN 'proposition' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'proposition';
                    
                WHEN 'vote_utile' THEN
                    SELECT COUNT(*) INTO contribution_count
                    FROM reward_contributions
                    WHERE user_id = p_user_id 
                    AND contribution_type = 'vote_utile';
                    
                ELSE
                    contribution_count := 0;
            END CASE;
            
            -- Si le critère est atteint, attribuer le badge
            IF contribution_count >= (badge_record.criteria_json->>'count')::INT THEN
                user_badges := jsonb_set(
                    user_badges,
                    ARRAY[badge_record.badge_code],
                    to_jsonb(NOW()::TEXT)
                );
                
                new_badges := new_badges || jsonb_build_object(
                    'badge_code', badge_record.badge_code,
                    'badge_name', badge_record.badge_name,
                    'description', badge_record.description
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Mettre à jour les badges de l'utilisateur
    UPDATE users
    SET badges_json = user_badges
    WHERE id = p_user_id;
    
    RETURN new_badges;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FONCTION: Enregistrer une contribution
-- ============================================

CREATE OR REPLACE FUNCTION record_contribution(
    p_user_id UUID,
    p_contribution_type VARCHAR(50),
    p_related_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    points INT;
    user_total_points INT;
    user_current_level INT;
    new_level INT;
    new_level_name VARCHAR(50);
    level_changed BOOLEAN := false;
    new_badges JSONB;
    contribution_id UUID;
BEGIN
    -- Calculer les points
    points := calculate_contribution_points(p_contribution_type, p_details);
    
    -- Insérer dans reward_contributions
    INSERT INTO reward_contributions (user_id, contribution_type, points_awarded, related_entity_id, details)
    VALUES (p_user_id, p_contribution_type, points, p_related_entity_id, p_details)
    RETURNING id INTO contribution_id;
    
    -- Mettre à jour les points totaux
    UPDATE users
    SET total_points = total_points + points
    WHERE id = p_user_id
    RETURNING total_points, current_level INTO user_total_points, user_current_level;
    
    -- Vérifier changement de niveau
    SELECT level_id, level_name INTO new_level, new_level_name
    FROM levels
    WHERE points_required <= user_total_points
    ORDER BY points_required DESC
    LIMIT 1;
    
    IF new_level > user_current_level THEN
        UPDATE users
        SET current_level = new_level,
            last_level_up_date = NOW()
        WHERE id = p_user_id;
        level_changed := true;
    END IF;
    
    -- Vérifier et attribuer les badges
    new_badges := check_and_award_badges(p_user_id);
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'contribution_id', contribution_id,
        'points_awarded', points,
        'total_points', user_total_points,
        'level_changed', level_changed,
        'new_level', CASE WHEN level_changed THEN 
            jsonb_build_object('level_id', new_level, 'level_name', new_level_name)
        ELSE NULL END,
        'badges_unlocked', new_badges
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGERS: Automatisation des récompenses
-- ============================================

-- TRIGGER AVIS
CREATE OR REPLACE FUNCTION trigger_avis_contribution()
RETURNS TRIGGER AS $$
DECLARE
    character_count INT;
BEGIN
    character_count := LENGTH(COALESCE(NEW.commentaire, ''));
    
    PERFORM record_contribution(
        NEW.utilisateur_id,
        'avis',
        NEW.id,
        jsonb_build_object('character_count', character_count, 'note', NEW.note)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS avis_contribution_trigger ON avis;
CREATE TRIGGER avis_contribution_trigger
    AFTER INSERT ON avis
    FOR EACH ROW
    EXECUTE FUNCTION trigger_avis_contribution();

-- TRIGGER PROPOSITIONS
CREATE OR REPLACE FUNCTION trigger_proposition_contribution()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM record_contribution(
        NEW.propose_par,
        'proposition',
        NEW.id,
        jsonb_build_object('type', NEW.type)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposition_contribution_trigger ON propositions;
CREATE TRIGGER proposition_contribution_trigger
    AFTER INSERT ON propositions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_proposition_contribution();

-- TRIGGER SIGNALEMENTS
CREATE OR REPLACE FUNCTION trigger_signalement_contribution()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM record_contribution(
        NEW.signale_par,
        'signalement',
        NEW.id,
        jsonb_build_object('type', NEW.type)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signalement_contribution_trigger ON signalements;
CREATE TRIGGER signalement_contribution_trigger
    AFTER INSERT ON signalements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_signalement_contribution();

-- ============================================
-- 9. VUES UTILES
-- ============================================

-- Classement des utilisateurs
CREATE OR REPLACE VIEW user_leaderboard AS
SELECT 
    u.id,
    u.nom,
    u.prenom,
    u.avatar,
    u.total_points,
    u.current_level,
    l.level_name,
    jsonb_object_keys(COALESCE(u.badges_json, '{}'::jsonb)) as badge_count,
    ROW_NUMBER() OVER (ORDER BY u.total_points DESC) as rank
FROM users u
LEFT JOIN levels l ON u.current_level = l.level_id
WHERE u.actif = true
ORDER BY u.total_points DESC;

-- Statistiques par utilisateur
CREATE OR REPLACE VIEW user_contribution_stats AS
WITH type_counts AS (
    SELECT 
        user_id,
        contribution_type,
        COUNT(*) as type_count
    FROM reward_contributions
    GROUP BY user_id, contribution_type
),
user_totals AS (
    SELECT 
        user_id,
        COUNT(*) as total_contributions,
        SUM(points_awarded) as total_points_earned,
        COUNT(DISTINCT contribution_type) as contribution_types_count,
        COUNT(DISTINCT DATE(contribution_date)) as active_days,
        MAX(contribution_date) as last_contribution_date
    FROM reward_contributions
    GROUP BY user_id
)
SELECT 
    ut.user_id,
    ut.total_contributions,
    ut.total_points_earned,
    ut.contribution_types_count,
    ut.active_days,
    ut.last_contribution_date,
    jsonb_object_agg(tc.contribution_type, tc.type_count) as contributions_by_type
FROM user_totals ut
LEFT JOIN type_counts tc ON ut.user_id = tc.user_id
GROUP BY 
    ut.user_id,
    ut.total_contributions,
    ut.total_points_earned,
    ut.contribution_types_count,
    ut.active_days,
    ut.last_contribution_date;

-- ============================================
-- 10. PERMISSIONS RLS
-- ============================================

ALTER TABLE reward_contributions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs voient leurs propres contributions
CREATE POLICY "Utilisateurs voient leurs contributions"
    ON reward_contributions FOR SELECT
    USING (user_id = auth.uid());

-- Les admins voient tout
CREATE POLICY "Admins voient toutes les contributions"
    ON reward_contributions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
            AND users.actif = true
        )
    );

-- Seul le système peut insérer (via triggers)
CREATE POLICY "Système insère les contributions"
    ON reward_contributions FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 11. MIGRATION DONNÉES EXISTANTES
-- ============================================

DO $$
DECLARE
    user_record RECORD;
    initial_points INT;
BEGIN
    RAISE NOTICE 'Début de la migration des données existantes...';
    
    FOR user_record IN SELECT id FROM users WHERE actif = true LOOP
        initial_points := 0;
        
        -- Compter les avis existants (10 points chacun minimum)
        initial_points := initial_points + (
            SELECT COALESCE(COUNT(*) * 10, 0) FROM avis WHERE utilisateur_id = user_record.id
        );
        
        -- Compter les propositions (20 points chacune)
        initial_points := initial_points + (
            SELECT COALESCE(COUNT(*) * 20, 0) FROM propositions WHERE propose_par = user_record.id
        );
        
        -- Compter les signalements (8 points chacun)
        initial_points := initial_points + (
            SELECT COALESCE(COUNT(*) * 8, 0) FROM signalements WHERE signale_par = user_record.id
        );
        
        -- Mettre à jour les points sans créer d'historique
        UPDATE users
        SET total_points = initial_points
        WHERE id = user_record.id;
        
        -- Mettre à jour le niveau
        UPDATE users u
        SET current_level = (
            SELECT level_id 
            FROM levels 
            WHERE points_required <= u.total_points 
            ORDER BY points_required DESC 
            LIMIT 1
        )
        WHERE id = user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration des données terminée';
END $$;

-- ============================================
-- 12. COMMENTAIRES
-- ============================================

COMMENT ON TABLE reward_contributions IS 'Historique détaillé de toutes les contributions récompensées';
COMMENT ON TABLE levels IS 'Configuration des niveaux et seuils de points';
COMMENT ON TABLE badges IS 'Configuration des badges et critères';
COMMENT ON COLUMN users.total_points IS 'Total des points accumulés';
COMMENT ON COLUMN users.current_level IS 'Niveau actuel basé sur les points';
COMMENT ON COLUMN users.badges_json IS 'Badges obtenus {"badge_code": "date"}';
COMMENT ON FUNCTION record_contribution IS 'Enregistre une contribution, attribue les points et vérifie les badges';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

DO $$
DECLARE
    total_users INT;
    total_reward_contributions INT;
    total_points_awarded INT;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users WHERE actif = true;
    SELECT COUNT(*) INTO total_reward_contributions FROM reward_contributions;
    SELECT SUM(points_awarded) INTO total_points_awarded FROM reward_contributions;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Utilisateurs actifs: %', total_users;
    RAISE NOTICE 'Contributions récompensées: %', COALESCE(total_reward_contributions, 0);
    RAISE NOTICE 'Points totaux attribués: %', COALESCE(total_points_awarded, 0);
    RAISE NOTICE '========================================';
END $$;
