@echo off
REM Script PowerShell pour exécuter le SQL via Supabase CLI
REM Vérifiez d'abord que supabase CLI est installé

echo Tentative d'exécution via Supabase CLI...
where supabase >nul 2>&1
if errorlevel 1 (
    echo Supabase CLI non trouvé. Installation ou configuration requise.
    echo Visitez: https://supabase.com/docs/guides/cli
    exit /b 1
)

REM Exécute le script SQL
echo Exécution du script fixCotonou.sql...
supabase sql execute --file fixCotonou.sql

echo Script terminé!
