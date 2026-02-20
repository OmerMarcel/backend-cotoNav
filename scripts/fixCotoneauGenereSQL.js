// Script to fix Cotonou arrondissements via API
const http = require("http");

const API_BASE = "http://localhost:5000";

// Les 12 arrondissements de Cotonou
const arronDisementsCotonouCoriges = [
  {
    nom: "1er arrondissement de Cotonou",
    latitude: 6.3725,
    longitude: 2.476667,
  },
  {
    nom: "2e arrondissement de Cotonou",
    latitude: 6.386667,
    longitude: 2.4625,
  },
  {
    nom: "3e arrondissement de Cotonou",
    latitude: 6.382222,
    longitude: 2.443333,
  },
  {
    nom: "4e arrondissement de Cotonou",
    latitude: 6.370361,
    longitude: 2.446111,
  },
  {
    nom: "5e arrondissement de Cotonou",
    latitude: 6.369444,
    longitude: 2.394167,
  },
  {
    nom: "6e arrondissement de Cotonou",
    latitude: 6.368056,
    longitude: 2.426111,
  },
  {
    nom: "7e arrondissement de Cotonou",
    latitude: 6.368056,
    longitude: 2.426111,
  },
  {
    nom: "8e arrondissement de Cotonou",
    latitude: 6.381944,
    longitude: 2.411389,
  },
  {
    nom: "9e arrondissement de Cotonou",
    latitude: 6.370556,
    longitude: 2.392222,
  },
  {
    nom: "10e arrondissement de Cotonou",
    latitude: 6.391667,
    longitude: 2.385278,
  },
  {
    nom: "11e arrondissement de Cotonou",
    latitude: 6.369167,
    longitude: 2.386667,
  },
  {
    nom: "12e arrondissement de Cotonou",
    latitude: 6.369167,
    longitude: 2.386667,
  },
];

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fixCotoneauArrondissements() {
  try {
    console.log(
      "🔄 Début de la correction des arrondissements de Cotonou via API...\n",
    );

    // Step 1: Create a SQL execution endpoint or use Supabase directly
    // Since we don't have a direct SQL execution endpoint, create a direct PostgreSQL solution script

    console.log("⚠️  Note: Ce script nécessite un accès à PostGIS.");
    console.log("Création du script SQL brut à exécuter directement...\n");

    // Generate SQL script
    const sqlScript = generateSQLScript();

    // Save to file
    const fs = require("fs");
    const sqlFile = "fixCotonou.sql";
    fs.writeFileSync(sqlFile, sqlScript);

    console.log("✅ Script SQL généré: " + sqlFile);
    console.log("\n📋 Contenu du script SQL:");
    console.log("=".repeat(60));
    console.log(sqlScript);
    console.log("=".repeat(60));

    console.log("\n💡 Comment exécuter ce script SQL:");
    console.log("   1. Ouvrez Supabase Dashboard");
    console.log("   2. Allez à SQL Editor > New Query");
    console.log("   3. Copiez-collez le contenu du fichier fixCotonou.sql");
    console.log("   4. Exécutez (Run)");
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

function generateSQLScript() {
  let sql = `-- Script de correction des arrondissements de Cotonou
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
`;

  arronDisementsCotonouCoriges.forEach((arr, idx) => {
    const comma = idx < arronDisementsCotonouCoriges.length - 1 ? "," : ";";
    sql += `('${arr.nom}', (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1), ST_SetSRID(ST_MakePoint(${arr.longitude}, ${arr.latitude}), 4326))${comma}\n`;
  });

  sql += `
-- Vérification
SELECT 'Arrondissements insérés:' as message, count(*) as total 
FROM arrondissements 
WHERE commune_id = (SELECT id FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1);

COMMIT;
`;

  return sql;
}

fixCotoneauArrondissements();
