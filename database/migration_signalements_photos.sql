-- Migration : s'assurer que la table signalements possède la colonne photos
-- (déjà présente dans le schéma initial ; utile pour les bases créées avant)
-- Format : JSONB, tableau d'URLs ou d'objets { "url": "..." }

ALTER TABLE signalements
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN signalements.photos IS 'URLs des photos jointes au signalement (tableau de strings ou d''objets {url} depuis /api/upload)';
