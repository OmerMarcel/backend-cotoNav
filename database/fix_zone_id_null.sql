-- Script pour vérifier et corriger les contraintes sur zone_id

-- 1. Vérifier la structure actuelle
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'zone_id';

-- 2. Si zone_id n'accepte pas NULL, corriger :
-- ALTER TABLE users ALTER COLUMN zone_id DROP NOT NULL;

-- 3. Vérifier les contraintes de clé étrangère
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'users'
AND kcu.column_name = 'zone_id';

-- 4. Si la contrainte de clé étrangère empêche NULL, modifier :
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_zone_id_fkey;
-- ALTER TABLE users ADD CONSTRAINT users_zone_id_fkey 
--   FOREIGN KEY (zone_id) REFERENCES zones(id) 
--   ON DELETE SET NULL 
--   ON UPDATE CASCADE;

-- 5. Vérifier qu'il n'y a pas de contrainte CHECK qui bloque
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND check_clause LIKE '%zone_id%';

