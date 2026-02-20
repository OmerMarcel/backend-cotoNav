-- Script de correction des arrondissements de Cotonou
-- Exécutez ce script dans Supabase > SQL Editor

BEGIN;

-- Étape 1: Trouver la commune Cotonou
WITH cotonou_commune AS (
  SELECT id FROM communes 
  WHERE nom ILIKE '%cotonou%' 
  LIMIT 1
)

-- Étape 2: Supprimer les anciens arrondissements
DELETE FROM arrondissements 
WHERE commune_id = (SELECT id FROM cotonou_commune);

-- Étape 3: Insérer les nouveaux arrondissements avec les bonnes coordonnées
INSERT INTO arrondissements (nom, commune_id, geom) VALUES
('1er arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.476667, 6.3725), 4326)),
('2e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.4625, 6.386667), 4326)),
('3e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.443333, 6.382222), 4326)),
('4e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.446111, 6.370361), 4326)),
('5e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.394167, 6.369444), 4326)),
('6e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.426111, 6.368056), 4326)),
('7e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.426111, 6.368056), 4326)),
('8e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.411389, 6.381944), 4326)),
('9e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.392222, 6.370556), 4326)),
('10e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.385278, 6.391667), 4326)),
('11e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.386667, 6.369167), 4326)),
('12e arrondissement de Cotonou', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(2.386667, 6.369167), 4326));

-- Vérification
SELECT 'Arrondissements insérés:' as message, count(*) as total 
FROM arrondissements 
WHERE commune_id = (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1);

COMMIT;
