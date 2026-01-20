-- Script de migration pour ajouter le système de rôles hiérarchique
-- À exécuter sur Supabase pour mettre à jour la base de données existante

-- 1. Créer la table des zones géographiques
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('arrondissement', 'secteur', 'quartier')),
    parent_id UUID REFERENCES zones(id),
    limites JSONB, -- Polygon GeoJSON pour délimiter la zone
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nom, type, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_zones_parent ON zones(parent_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_actif ON zones(actif);

-- 2. Créer la table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    zone_id UUID REFERENCES zones(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_zone ON audit_logs(zone_id);

-- 3. Ajouter les nouvelles colonnes à la table users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id),
  ADD COLUMN IF NOT EXISTS cree_par UUID REFERENCES users(id);

-- 4. Ajouter zone_id aux infrastructures
ALTER TABLE infrastructures
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

CREATE INDEX IF NOT EXISTS idx_infrastructures_zone ON infrastructures(zone_id);
CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
CREATE INDEX IF NOT EXISTS idx_users_cree_par ON users(cree_par);

-- 5. Mettre à jour la contrainte CHECK du rôle pour accepter les nouveaux rôles
-- D'abord, supprimer la contrainte existante
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Créer la nouvelle contrainte avec les nouveaux rôles
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin', 'moderateur'));

-- 6. Migrer les anciens rôles vers les nouveaux rôles
-- 'moderateur' reste pour rétrocompatibilité, mais sera traité comme 'admin' dans le code
-- Si vous voulez migrer tous les 'moderateur' en 'admin', décommentez la ligne suivante :
-- UPDATE users SET role = 'admin' WHERE role = 'moderateur';

-- 7. Trigger pour mettre à jour updated_at sur zones
CREATE TRIGGER IF NOT EXISTS update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Créer quelques zones d'exemple pour Cotonou (optionnel)
-- Vous pouvez supprimer cette section si vous préférez créer les zones via l'API
INSERT INTO zones (nom, type, actif) VALUES 
  ('Cotonou I', 'arrondissement', true),
  ('Cotonou II', 'arrondissement', true),
  ('Cotonou III', 'arrondissement', true),
  ('Cotonou IV', 'arrondissement', true),
  ('Cotonou V', 'arrondissement', true)
ON CONFLICT DO NOTHING;

-- 9. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration terminée avec succès!';
  RAISE NOTICE 'Nouvelles tables créées: zones, audit_logs';
  RAISE NOTICE 'Nouvelles colonnes ajoutées: users.zone_id, users.cree_par, infrastructures.zone_id';
  RAISE NOTICE 'Nouveaux rôles supportés: agent_communal, admin, super_admin';
END $$;

