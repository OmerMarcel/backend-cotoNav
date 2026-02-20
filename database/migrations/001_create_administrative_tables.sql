-- ============================================
-- Migration: Créer les tables administratives
-- ============================================

-- Table des Départements
CREATE TABLE IF NOT EXISTS departements (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des Communes
CREATE TABLE IF NOT EXISTS communes (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  departement_id BIGINT REFERENCES departements(id),
  population VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(nom, departement_id)
);

-- Table des Arrondissements
CREATE TABLE IF NOT EXISTS arrondissements (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  commune_id BIGINT REFERENCES communes(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  adresse TEXT,
  observations TEXT,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des Mairies
CREATE TABLE IF NOT EXISTS mairies (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  commune_id BIGINT REFERENCES communes(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  adresse TEXT,
  observations TEXT,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des Préfectures
CREATE TABLE IF NOT EXISTS prefectures (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  departement_id BIGINT REFERENCES departements(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  adresse TEXT,
  observations TEXT,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(nom, departement_id)
);

-- Table de liaison entre Contributions et localisation administrative
CREATE TABLE IF NOT EXISTS contributions_localisation_admin (
  id BIGSERIAL PRIMARY KEY,
  contribution_id BIGINT,
  arrondissement_id BIGINT REFERENCES arrondissements(id),
  commune_id BIGINT REFERENCES communes(id),
  departement_id BIGINT REFERENCES departements(id),
  prefecture_id BIGINT REFERENCES prefectures(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_arrondissement DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index géospatiaux pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_arrondissements_geom ON arrondissements USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_mairies_geom ON mairies USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_prefectures_geom ON prefectures USING GIST(geom);

-- Index pour les recherches par commune et département
CREATE INDEX IF NOT EXISTS idx_communes_departement ON communes(departement_id);
CREATE INDEX IF NOT EXISTS idx_arrondissements_commune ON arrondissements(commune_id);
CREATE INDEX IF NOT EXISTS idx_mairies_commune ON mairies(commune_id);
CREATE INDEX IF NOT EXISTS idx_prefectures_departement ON prefectures(departement_id);

-- Index pour les contributions
CREATE INDEX IF NOT EXISTS idx_contributions_loc_arrondissement ON contributions_localisation_admin(arrondissement_id);
CREATE INDEX IF NOT EXISTS idx_contributions_loc_commune ON contributions_localisation_admin(commune_id);
CREATE INDEX IF NOT EXISTS idx_contributions_loc_departement ON contributions_localisation_admin(departement_id);

-- ============================================
-- Fonction PL/pgSQL pour trouver l'arrondissement le plus proche
-- ============================================
CREATE OR REPLACE FUNCTION find_nearest_arrondissement(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS TABLE(
  arrondissement_id BIGINT,
  arrondissement_nom VARCHAR,
  commune_id BIGINT,
  commune_nom VARCHAR,
  departement_id BIGINT,
  departement_nom VARCHAR,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.nom,
    c.id,
    c.nom,
    d.id,
    d.nom,
    ST_Distance(
      a.geom::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION as distance
  FROM arrondissements a
  JOIN communes c ON a.commune_id = c.id
  JOIN departements d ON c.departement_id = d.id
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Fonction pour trouver la mairie la plus proche
-- ============================================
CREATE OR REPLACE FUNCTION find_nearest_mairie(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS TABLE(
  mairie_id BIGINT,
  mairie_nom VARCHAR,
  commune_id BIGINT,
  commune_nom VARCHAR,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.nom,
    c.id,
    c.nom,
    ST_Distance(
      m.geom::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION as distance
  FROM mairies m
  JOIN communes c ON m.commune_id = c.id
  ORDER BY m.geom <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Fonction pour trouver la préfecture (par département)
-- ============================================
CREATE OR REPLACE FUNCTION find_prefecture_by_departement(
  p_departement_id BIGINT
)
RETURNS TABLE(
  prefecture_id BIGINT,
  prefecture_nom VARCHAR,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pref.id,
    pref.nom,
    ST_Distance(
      pref.geom::geography,
      pref.geom::geography
    )::DOUBLE PRECISION
  FROM prefectures pref
  WHERE pref.departement_id = p_departement_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Fonction complète: obtenir toutes les infos administratives
-- ============================================
CREATE OR REPLACE FUNCTION get_administrative_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS TABLE(
  arrondissement_id BIGINT,
  arrondissement_nom VARCHAR,
  commune_id BIGINT,
  commune_nom VARCHAR,
  departement_id BIGINT,
  departement_nom VARCHAR,
  prefecture_id BIGINT,
  prefecture_nom VARCHAR,
  distance_arrondissement DOUBLE PRECISION,
  distance_mairie DOUBLE PRECISION
) AS $$
DECLARE
  v_arrondissement_id BIGINT;
  v_commune_id BIGINT;
  v_departement_id BIGINT;
  v_prefecture_id BIGINT;
  v_distance_arr DOUBLE PRECISION;
  v_distance_mairie DOUBLE PRECISION;
BEGIN
  -- Trouver l'arrondissement le plus proche
  SELECT
    a.id, c.id, d.id, a.id,
    ST_Distance(
      a.geom::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )
  INTO
    v_arrondissement_id, v_commune_id, v_departement_id, 
    v_prefecture_id, v_distance_arr
  FROM arrondissements a
  JOIN communes c ON a.commune_id = c.id
  JOIN departements d ON c.departement_id = d.id
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  LIMIT 1;

  -- Trouver la mairie la plus proche
  SELECT
    ST_Distance(
      m.geom::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )
  INTO v_distance_mairie
  FROM mairies m
  ORDER BY m.geom <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  LIMIT 1;

  IF v_distance_mairie IS NULL THEN
    v_distance_mairie := 0;
  END IF;

  RETURN QUERY
  SELECT
    v_arrondissement_id,
    a.nom,
    v_commune_id,
    c.nom,
    v_departement_id,
    d.nom,
    pref.id,
    pref.nom,
    v_distance_arr,
    v_distance_mairie
  FROM arrondissements a
  JOIN communes c ON a.commune_id = c.id
  JOIN departements d ON c.departement_id = d.id
  LEFT JOIN prefectures pref ON pref.departement_id = d.id
  WHERE a.id = v_arrondissement_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;
