-- Script complet pour créer toutes les tables nécessaires dans Supabase
-- À exécuter dans le SQL Editor de Supabase
-- Ce script crée les tables dans le bon ordre pour éviter les erreurs de dépendances

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 2. TABLE ZONES (sans dépendances)
-- ============================================
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('arrondissement', 'secteur', 'quartier')),
    parent_id UUID REFERENCES zones(id),
    limites JSONB, -- Polygon GeoJSON pour délimiter la zone
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contrainte unique avec expression (pour gérer les valeurs NULL dans parent_id)
-- Si parent_id est NULL, on utilise un UUID zéro pour la contrainte unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zones_nom_type_parent_unique'
    ) THEN
        CREATE UNIQUE INDEX zones_nom_type_parent_unique 
        ON zones (nom, type, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_zones_parent ON zones(parent_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_actif ON zones(actif);

-- ============================================
-- 3. TABLE USERS (si elle n'existe pas déjà)
-- ============================================
-- Note: Ne crée que si elle n'existe pas pour éviter d'écraser des données existantes
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(255) NOT NULL,
            prenom VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            telephone VARCHAR(50),
            password VARCHAR(255),
            auth_provider VARCHAR(50) DEFAULT 'email',
            role VARCHAR(50) DEFAULT 'citoyen' CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin', 'moderateur')),
            zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
            avatar TEXT,
            actif BOOLEAN DEFAULT true,
            contributions JSONB DEFAULT '{"infrastructuresProposees": 0, "avisLaisses": 0, "signalements": 0}'::jsonb,
            cree_par UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
        CREATE INDEX IF NOT EXISTS idx_users_cree_par ON users(cree_par);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_actif ON users(actif);
    ELSE
        -- La table existe, vérifier et ajouter les colonnes manquantes
        -- Ajouter zone_id si manquante
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'zone_id'
        ) THEN
            ALTER TABLE users 
            ADD COLUMN zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
        END IF;
        
        -- Ajouter cree_par si manquante
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'cree_par'
        ) THEN
            ALTER TABLE users 
            ADD COLUMN cree_par UUID REFERENCES users(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_users_cree_par ON users(cree_par);
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. TABLE AUDIT_LOGS (dépend de users et zones)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    resource_type VARCHAR(50) NOT NULL, -- user, infrastructure, proposition, signalement, etc.
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb, -- Détails de l'action (anciennes valeurs, nouvelles valeurs, etc.)
    ip_address INET,
    user_agent TEXT,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL, -- Zone concernée si applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_zone ON audit_logs(zone_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) pour Supabase
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Super admins et admins peuvent voir tous les logs d'audit" ON audit_logs;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs propres logs d'audit" ON audit_logs;
DROP POLICY IF EXISTS "Insertion de logs d'audit autorisée" ON audit_logs;

-- Politique RLS : Les super admins et admins peuvent voir tous les logs
CREATE POLICY "Super admins et admins peuvent voir tous les logs d'audit"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'admin')
            AND users.actif = true
        )
    );

-- Politique RLS : Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Utilisateurs peuvent voir leurs propres logs d'audit"
    ON audit_logs FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Politique RLS : Le système peut insérer des logs (via service_role)
-- Note: Les insertions se font généralement via service_role qui bypass RLS
-- Mais on crée la politique pour être sûr
CREATE POLICY "Insertion de logs d'audit autorisée"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 6. COMMENTAIRES POUR DOCUMENTATION
-- ============================================
COMMENT ON TABLE audit_logs IS 'Table de logs d''audit pour tracer toutes les actions importantes du système';
COMMENT ON COLUMN audit_logs.action IS 'Type d''action effectuée (CREATE, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type de ressource concernée (user, infrastructure, proposition, signalement, etc.)';
COMMENT ON COLUMN audit_logs.details IS 'Détails JSON de l''action (anciennes valeurs, nouvelles valeurs, etc.)';

