-- Schéma de base de données pour Supabase (PostgreSQL)

-- Extension PostGIS pour la géolocalisation
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table des zones géographiques (arrondissements, secteurs)
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
CREATE UNIQUE INDEX IF NOT EXISTS zones_nom_type_parent_unique 
ON zones (nom, type, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_zones_parent ON zones(parent_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(type);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(50),
    password VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'email',
    role VARCHAR(50) DEFAULT 'citoyen' CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin')),
    zone_id UUID REFERENCES zones(id), -- Zone assignée pour admin et agent_communal
    avatar TEXT,
    actif BOOLEAN DEFAULT true,
    contributions JSONB DEFAULT '{"infrastructuresProposees": 0, "avisLaisses": 0, "signalements": 0}'::jsonb,
    cree_par UUID REFERENCES users(id), -- Qui a créé ce compte (pour audit)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);

-- Table des infrastructures
CREATE TABLE IF NOT EXISTS infrastructures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('toilettes_publiques', 'parc_jeux', 'centre_sante', 'installation_sportive', 'espace_divertissement', 'autre')),
    description TEXT,
    localisation JSONB NOT NULL, -- {type: "Point", coordinates: [longitude, latitude], adresse, quartier, commune}
    photos JSONB DEFAULT '[]'::jsonb,
    horaires JSONB DEFAULT '{}'::jsonb,
    equipements JSONB DEFAULT '[]'::jsonb,
    accessibilite JSONB DEFAULT '{"pmr": false, "enfants": false}'::jsonb,
    contact JSONB DEFAULT '{}'::jsonb,
    etat VARCHAR(50) DEFAULT 'bon' CHECK (etat IN ('excellent', 'bon', 'moyen', 'degrade', 'ferme')),
    note_moyenne DECIMAL(3,2) DEFAULT 0 CHECK (note_moyenne >= 0 AND note_moyenne <= 5),
    nombre_avis INTEGER DEFAULT 0,
    niveau_frequentation VARCHAR(50) DEFAULT 'moyen' CHECK (niveau_frequentation IN ('faible', 'moyen', 'eleve')),
    cree_par UUID REFERENCES users(id),
    valide BOOLEAN DEFAULT false,
    valide_par UUID REFERENCES users(id),
    valide_le TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des favoris utilisateur/infrastructure
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    infrastructure_id UUID NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, infrastructure_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_infra ON user_favorites(infrastructure_id);

-- Index géospatial pour les requêtes de proximité
CREATE INDEX IF NOT EXISTS idx_infrastructures_localisation ON infrastructures USING GIN (localisation);
CREATE INDEX IF NOT EXISTS idx_infrastructures_type ON infrastructures(type);
CREATE INDEX IF NOT EXISTS idx_infrastructures_quartier ON infrastructures((localisation->>'quartier'));
CREATE INDEX IF NOT EXISTS idx_infrastructures_valide ON infrastructures(valide);

-- Table des propositions
CREATE TABLE IF NOT EXISTS propositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('toilettes_publiques', 'parc_jeux', 'centre_sante', 'installation_sportive', 'espace_divertissement', 'autre')),
    description TEXT,
    localisation JSONB NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    horaires JSONB DEFAULT '{}'::jsonb,
    equipements JSONB DEFAULT '[]'::jsonb,
    propose_par UUID NOT NULL REFERENCES users(id),
    statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
    modere_par UUID REFERENCES users(id),
    commentaire_moderation TEXT,
    modere_le TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propositions_statut ON propositions(statut);
CREATE INDEX IF NOT EXISTS idx_propositions_propose_par ON propositions(propose_par);
CREATE INDEX IF NOT EXISTS idx_propositions_created_at ON propositions(created_at DESC);

ALTER TABLE IF EXISTS propositions
  ADD COLUMN IF NOT EXISTS horaires JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS equipements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb; -- Ajout du champ images pour compatibilité avec Flutter

-- Table des signalements
CREATE TABLE IF NOT EXISTS signalements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL CHECK (type IN ('equipement_degrade', 'fermeture_temporaire', 'information_incorrecte', 'autre')),
    description TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    signale_par UUID NOT NULL REFERENCES users(id),
    statut VARCHAR(50) DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'resolu', 'rejete')),
    traite_par UUID REFERENCES users(id),
    commentaire_traitement TEXT,
    traite_le TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signalements_statut ON signalements(statut);
CREATE INDEX IF NOT EXISTS idx_signalements_infrastructure ON signalements(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_signalements_created_at ON signalements(created_at DESC);

-- Table des avis
CREATE TABLE IF NOT EXISTS avis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
    utilisateur_id UUID NOT NULL REFERENCES users(id),
    note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
    commentaire TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    approuve BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(infrastructure_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS idx_avis_infrastructure ON avis(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_avis_utilisateur ON avis(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_avis_created_at ON avis(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_infrastructures_updated_at BEFORE UPDATE ON infrastructures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signalements_updated_at BEFORE UPDATE ON signalements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table des logs d'audit pour tracer toutes les actions importantes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    resource_type VARCHAR(50) NOT NULL, -- user, infrastructure, proposition, signalement, etc.
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb, -- Détails de l'action (anciennes valeurs, nouvelles valeurs, etc.)
    ip_address INET,
    user_agent TEXT,
    zone_id UUID REFERENCES zones(id), -- Zone concernée si applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Colonne zone_id pour les infrastructures (pour faciliter les filtres par zone)
ALTER TABLE IF EXISTS infrastructures
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

CREATE INDEX IF NOT EXISTS idx_infrastructures_zone ON infrastructures(zone_id);

-- Fonction pour mettre à jour la note moyenne d'une infrastructure
CREATE OR REPLACE FUNCTION update_infrastructure_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE infrastructures
    SET 
        note_moyenne = (
            SELECT COALESCE(AVG(note), 0)
            FROM avis
            WHERE infrastructure_id = COALESCE(NEW.infrastructure_id, OLD.infrastructure_id)
            AND approuve = true
        ),
        nombre_avis = (
            SELECT COUNT(*)
            FROM avis
            WHERE infrastructure_id = COALESCE(NEW.infrastructure_id, OLD.infrastructure_id)
            AND approuve = true
        )
    WHERE id = COALESCE(NEW.infrastructure_id, OLD.infrastructure_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour la note moyenne
CREATE TRIGGER update_rating_on_avis_change
    AFTER INSERT OR UPDATE OR DELETE ON avis
    FOR EACH ROW EXECUTE FUNCTION update_infrastructure_rating();

