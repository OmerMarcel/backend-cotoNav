#!/bin/bash
# Script pour exécuter le SQL via Supabase API

SUPABASE_URL="https://phcwxylbnfajzvucnvuh.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoY3d4eWxibmZhanp2dWNudnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzQzMTk5NjAsImV4cCI6MTk5MDA5NTk2MH0.SZ_2K-8HqYv4lRLANaVMSJkTSGCE6lH_HPpk1rYSgJQ"

echo "🔄 Exécution de la correction des arrondissements de Cotonou..."

# Lecture du fichier SQL
SQL_CONTENT=$(cat fixCotonou.sql)

# Envoi via Supabase SQL API ou utiliser psql directement
echo "📝 Tentative via psql..."

# Exécution directe avec psql
PGPASSWORD="" psql \
  --host=phcwxylbnfajzvucnvuh.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  -f fixCotonou.sql

if [ $? -eq 0 ]; then
    echo "✅ Script SQL exécuté avec succès!"
else
    echo "❌ Erreur lors de l'exécution"
    exit 1
fi
