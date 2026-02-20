#!/usr/bin/env node

/**
 * 🧪 Script de Test - Vérification du Système de Statistiques
 *
 * Teste que l'API retourne les données enrichies correctement
 */

const https = require("https");
const http = require("http");

const API_URL = "http://localhost:5000/api";
const tests = [];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function testStatistics() {
  console.log("\n📊 TEST 1: Récupération des statistiques globales\n");
  try {
    const data = await makeRequest(`${API_URL}/statistics`);

    console.log("✅ Réponse reçue");
    console.log(
      `   • Infrastructures totales: ${data.general?.totalInfrastructures || 0}`,
    );
    console.log(
      `   • Propositions totales: ${data.general?.totalPropositions || 0}`,
    );
    console.log(`   • Utilisateurs totaux: ${data.general?.totalUsers || 0}`);

    tests.push({
      name: "Statistiques générales",
      pass: data.general?.totalInfrastructures > 0,
    });

    console.log("\n📈 Données par Type:");
    (data.parType || []).slice(0, 3).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    console.log("\n🏙️ Données par Département:");
    (data.parDepartement || []).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    tests.push({
      name: "Département enrichi",
      pass: data.parDepartement?.some(
        (d) => d._id !== "Non spécifié" && d._id !== "undefined",
      ),
    });

    console.log("\n🏘️ Données par Commune:");
    (data.parCommune || []).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    tests.push({
      name: "Communes affichées",
      pass: data.parCommune && data.parCommune.length > 0,
    });

    console.log("\n🗺️ Données par Arrondissement:");
    (data.parArrondissement || []).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    console.log("\n🏞️ Données par Village/Quartier:");
    (data.parVillage || []).slice(0, 5).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    tests.push({ name: "Statistiques générales", pass: false });
    return false;
  }
}

async function testCommunesByDepartement() {
  console.log("\n📊 TEST 2: Communes par Département\n");
  try {
    const data = await makeRequest(
      `${API_URL}/statistics/communes?departement=Littoral`,
    );

    console.log("✅ Réponse reçue");
    console.log(`   Communes en Littoral:`);
    (data.data || []).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    tests.push({
      name: "Commune par département",
      pass: data.data && data.data.length > 0,
    });
    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    tests.push({ name: "Commune par département", pass: false });
    return false;
  }
}

async function testArrondissements() {
  console.log("\n📊 TEST 3: Arrondissements par Département\n");
  try {
    const data = await makeRequest(
      `${API_URL}/statistics/arrondissements?departement=Littoral`,
    );

    console.log("✅ Réponse reçue");
    console.log(`   Arrondissements:`);
    (data.data || []).slice(0, 5).forEach((item) => {
      console.log(`   • ${item._id}: ${item.count}`);
    });

    tests.push({
      name: "Arrondissement par département",
      pass: data.data !== undefined,
    });
    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    tests.push({ name: "Arrondissement par département", pass: false });
    return false;
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║  🧪 Tests du Système de Statistiques             ║");
  console.log("╚════════════════════════════════════════════════════╝");

  await testStatistics();
  await testCommunesByDepartement();
  await testArrondissements();

  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║  📋 RÉSUMÉ DES TESTS                             ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  let passCount = 0;
  tests.forEach((test, idx) => {
    const icon = test.pass ? "✅" : "❌";
    console.log(`${idx + 1}. ${icon} ${test.name}`);
    if (test.pass) passCount++;
  });

  console.log(`\nTotal: ${passCount}/${tests.length} tests réussis`);

  if (passCount === tests.length) {
    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS!\n");
    console.log("Le système de statistiques fonctionne correctement.");
    console.log(
      "Le dashboard peut maintenant afficher les graphes sans erreur.",
    );
  } else {
    console.log("\n⚠️  Certains tests ont échoué.");
    console.log("Vérifiez les messages d'erreur ci-dessus.");
  }
}

// Lancer les tests
runAllTests().catch(console.error);
