-- Script rapide pour mettre à jour la contrainte CHECK du rôle
-- À exécuter immédiatement sur Supabase SQL Editor

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Créer la nouvelle contrainte avec tous les rôles supportés
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin', 'moderateur'));

-- Vérification
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';

