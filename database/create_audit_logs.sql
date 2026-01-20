-- Script pour créer la table audit_logs dans Supabase
-- À exécuter dans le SQL Editor de Supabase
-- NOTE: Ce script crée aussi la table zones si elle n'existe pas

-- 1. D'abord, créer la table zones si elle n'existe pas (requis pour les clés étrangères)
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

-- 2. Ensuite, créer la table audit_logs
-- Table des logs d'audit pour tracer toutes les actions importantes
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

-- Activer Row Level Security (RLS) pour Supabase
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- Commentaires pour documentation
COMMENT ON TABLE audit_logs IS 'Table de logs d''audit pour tracer toutes les actions importantes du système';
COMMENT ON COLUMN audit_logs.action IS 'Type d''action effectuée (CREATE, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type de ressource concernée (user, infrastructure, proposition, signalement, etc.)';
COMMENT ON COLUMN audit_logs.details IS 'Détails JSON de l''action (anciennes valeurs, nouvelles valeurs, etc.)';

