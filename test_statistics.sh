#!/bin/bash
# Script de test des endpoints de statistiques

API_URL="http://localhost:5000/api"

echo "🔍 Test des endpoints de statistiques"
echo "======================================"
echo ""

# Test 1: Sans token (doit échouer)
echo "1️⃣  Test /statistics SANS token:"
curl -s "$API_URL/statistics" | jq . || echo "Erreur ou pas de JSON"
echo ""

# Test 2: Récupérer un token de test (en supposant qu'on a un compte)
# Vous aurez besoin d'adapter ceci avec vos creds
echo "2️⃣  Pour tester avec un token, créez d'abord un compte admin:"
echo "   Utilisez la route POST /auth/register ou login"
echo ""

# Test 3: Exemple avec un token (remplacez YOUR_TOKEN)
echo "3️⃣  Exemple de test AVEC token:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:5000/api/statistics"
echo ""

# Test 4: Vérifier si les routes existent
echo "4️⃣  Vérification des routes disponibles..."
echo "   GET  /api/statistics"
echo "   GET  /api/statistics/communes?departement=Littoral"
echo "   GET  /api/statistics/arrondissements?commune=Cotonou"
echo "   GET  /api/statistics/villages?arrondissement=..."
