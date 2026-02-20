const { Pool } = require("pg");
require("dotenv").config();

// Configuration PostgreSQL pour Supabase
const pool = new Pool({
  host: process.env.DB_HOST || "phcwxylbnfajzvucnvuh.supabase.co",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

// Les 12 arrondissements de Cotonou avec leurs coordonnées correctes
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

async function fixCotoneauArrondissements() {
  const client = await pool.connect();
  try {
    console.log(
      "🔄 Début de la correction des arrondissements de Cotonou...\n",
    );

    // Étape 1: Trouver la commune Cotonou
    console.log("📍 Étape 1: Recherche de la commune Cotonou...");
    const communesResult = await client.query(
      "SELECT id, nom FROM communes WHERE nom ILIKE '%cotonou%' LIMIT 1",
    );

    if (!communesResult.rows || communesResult.rows.length === 0) {
      throw new Error("Commune Cotonou non trouvée");
    }

    const cotoneauCommune = communesResult.rows[0];
    console.log(
      `✅ Commune trouvée: ${cotoneauCommune.nom} (ID: ${cotoneauCommune.id})\n`,
    );

    // Étape 2: Supprimer les anciens arrondissements de Cotonou
    console.log(
      "🗑️  Étape 2: Suppression des anciens arrondissements de Cotonou...",
    );
    const deleteResult = await client.query(
      "DELETE FROM arrondissements WHERE commune_id = $1",
      [cotoneauCommune.id],
    );
    console.log(`✅ ${deleteResult.rowCount} arrondissements supprimés\n`);

    // Étape 3-4: Insérer les nouveaux arrondissements
    console.log("💾 Étape 3: Insertion des 12 nouveaux arrondissements...");

    for (let i = 0; i < arronDisementsCotonouCoriges.length; i++) {
      const arr = arronDisementsCotonouCoriges[i];
      const geomSQL = `ST_SetSRID(ST_MakePoint($2, $1), 4326)`;

      await client.query(
        "INSERT INTO arrondissements (nom, commune_id, geom) VALUES ($1, $3, " +
          geomSQL +
          ")",
        [arr.latitude, arr.longitude, cotoneauCommune.id],
      );

      console.log(`   ✅ ${i + 1}/12: ${arr.nom}`);
    }

    console.log("\n✅ Insertion complétée\n");

    // Étape 5: Vérifier les données
    console.log("🔍 Étape 5: Vérification des données...");
    const verifyResult = await client.query(
      "SELECT id, nom FROM arrondissements WHERE commune_id = $1 ORDER BY nom",
      [cotoneauCommune.id],
    );

    console.log(
      `✅ Vérification: ${verifyResult.rowCount} arrondissements trouvés en base\n`,
    );

    console.log("=".repeat(60));
    console.log("🎉 Correction complétée avec succès !");
    console.log("=".repeat(60));
    console.log("\n📊 Résumé:");
    console.log(`   • Commune: ${cotoneauCommune.nom}`);
    console.log(`   • Arrondissements insérés: ${verifyResult.rowCount}`);
    console.log("\n📋 Arrondissements insérés:");
    verifyResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.nom}`);
    });
    console.log(
      '\n💡 Testez avec: curl "http://localhost:5000/api/administrative-location?latitude=6.3654&longitude=2.4183"',
    );
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCotoneauArrondissements();
