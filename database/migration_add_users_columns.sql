 -- Script de migration pour ajouter les colonnes manquantes à la table users
-- À exécuter dans le SQL Editor de Supabase
-- Ce script peut être exécuté plusieurs fois sans erreur (idempotent)

-- 1. Ajouter la colonne zone_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'zone_id'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
        
        RAISE NOTICE 'Colonne zone_id ajoutée à la table users';
    ELSE
        RAISE NOTICE 'Colonne zone_id existe déjà';
    END IF;
END $$;

-- 2. Ajouter la colonne cree_par si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'cree_par'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN cree_par UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Colonne cree_par ajoutée à la table users';
    ELSE
        RAISE NOTICE 'Colonne cree_par existe déjà';
    END IF;
END $$;

-- 3. Mettre à jour la contrainte CHECK pour inclure les nouveaux rôles si nécessaire
DO $$
BEGIN
    -- Vérifier si la contrainte existe
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'users' 
        AND constraint_name LIKE '%role%check%'
    ) THEN
        -- La contrainte existe, on va la recréer avec les bons rôles
        -- D'abord, on supprime l'ancienne contrainte si elle n'inclut pas super_admin
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.constraint_column_usage 
            WHERE table_name = 'users' 
            AND constraint_name LIKE '%role%check%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                -- Vérifier si la contrainte inclut super_admin
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = constraint_name_var
                    AND pg_get_constraintdef(oid) LIKE '%super_admin%'
                ) THEN
                    EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
                    ALTER TABLE users 
                    ADD CONSTRAINT users_role_check 
                    CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin', 'moderateur'));
                    RAISE NOTICE 'Contrainte de rôle mise à jour avec les nouveaux rôles';
                ELSE
                    RAISE NOTICE 'Contrainte de rôle déjà à jour';
                END IF;
            END IF;
        END;
    ELSE
        -- La contrainte n'existe pas, on la crée
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('citoyen', 'agent_communal', 'admin', 'super_admin', 'moderateur'));
        RAISE NOTICE 'Contrainte de rôle créée';
    END IF;
END $$;

-- 4. Vérifier que toutes les colonnes nécessaires existent
DO $$
BEGIN
    -- Liste des colonnes requises
    DECLARE
        required_columns TEXT[] := ARRAY[
            'id', 'nom', 'prenom', 'email', 'password', 
            'auth_provider', 'role', 'avatar', 'actif', 
            'contributions', 'created_at', 'last_login', 'updated_at',
            'zone_id', 'cree_par', 'telephone'
        ];
        missing_columns TEXT[] := ARRAY[]::TEXT[];
        col TEXT;
    BEGIN
        -- Vérifier chaque colonne
        FOREACH col IN ARRAY required_columns
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = col
            ) THEN
                missing_columns := array_append(missing_columns, col);
            END IF;
        END LOOP;
        
        -- Afficher les colonnes manquantes
        IF array_length(missing_columns, 1) > 0 THEN
            RAISE WARNING 'Colonnes manquantes détectées: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE 'Toutes les colonnes requises sont présentes';
        END IF;
    END;
END $$;

-- 5. S'assurer que les index nécessaires existent
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
CREATE INDEX IF NOT EXISTS idx_users_cree_par ON users(cree_par);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_actif ON users(actif);

-- 6. Vérification finale
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration terminée avec succès !';
    RAISE NOTICE 'La table users devrait maintenant avoir toutes les colonnes nécessaires.';
    RAISE NOTICE '========================================';
END $$;

