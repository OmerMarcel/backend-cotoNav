const { createClient } = require("@supabase/supabase-js");

// Configuration Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://phcwxylbnfajzvucnvuh.supabase.co";
const supabaseKey =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoY3d4eWxibmZhanp2dWNudnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzQzMTk5NjAsImV4cCI6MTk5MDA5NTk2MH0.SZ_2K-8HqYv4lRLANaVMSJkTSGCE6lH_HPpk1rYSgJQ";

const supabase = createClient(supabaseUrl, supabaseKey);

// Les 12 arrondissements de Cotonou avec leurs coordonnées correctes (latitude, longitude)
const arronDisementsCotonouCoriges = [
  {
    nom: "1er arrondissement de Cotonou",
    latitude: 6.3725, // 6° 22′ 21″
    longitude: 2.476667, // 2° 28′ 36″
  },
  {
    nom: "2e arrondissement de Cotonou",
    latitude: 6.386667, // 6° 23′ 12″
    longitude: 2.4625, // 2° 27′ 45″
  },
  {
    nom: "3e arrondissement de Cotonou",
    latitude: 6.382222, // 6° 22′ 56″
    longitude: 2.443333, // 2° 26′ 36″
  },
  {
    nom: "4e arrondissement de Cotonou",
    latitude: 6.370361, // 6° 22′ 13″
    longitude: 2.446111, // 2° 26′ 46″
  },
  {
    nom: "5e arrondissement de Cotonou",
    latitude: 6.369444, // 6° 22′ 10″
    longitude: 2.394167, // 2° 23′ 39″
  },
  {
    nom: "6e arrondissement de Cotonou",
    latitude: 6.368056, // 6° 22′ 07″
    longitude: 2.426111, // 2° 25′ 34″
  },
  {
    nom: "7e arrondissement de Cotonou",
    latitude: 6.368056, // 6° 22′ 07″
    longitude: 2.426111, // 2° 25′ 34″
  },
  {
    nom: "8e arrondissement de Cotonou",
    latitude: 6.381944, // 6° 22′ 55″
    longitude: 2.411389, // 2° 24′ 41″
  },
  {
    nom: "9e arrondissement de Cotonou",
    latitude: 6.370556, // 6° 22′ 14″
    longitude: 2.392222, // 2° 23′ 32″
  },
  {
    nom: "10e arrondissement de Cotonou",
    latitude: 6.391667, // 6° 23′ 30″
    longitude: 2.385278, // 2° 23′ 07″
  },
  {
    nom: "11e arrondissement de Cotonou",
    latitude: 6.369167, // 6° 22′ 09″
    longitude: 2.386667, // 2° 23′ 12″
  },
  {
    nom: "12e arrondissement de Cotonou",
    latitude: 6.369167, // 6° 22′ 09″
    longitude: 2.386667, // 2° 23′ 12″
  },
];

async function fixCotenovemArrondissements() {
  try {
    console.log(
      "🔄 Début de la correction des arrondissements de Cotonou...\n",
    );

    // Étape 1: Trouver la commune Cotonou
    console.log("📍 Étape 1: Recherche de la commune Cotonou...");
    const { data: communes, error: communesError } = await supabase
      .from("communes")
      .select("id, nom")
      .ilike("nom", "%cotonou%");

    if (communesError) {
      throw new Error(
        `Erreur lors de la recherche de Cotonou: ${communesError.message}`,
      );
    }

    if (!communes || communes.length === 0) {
      throw new Error("Commune Cotonou non trouvée");
    }

    const cotoneauCommune = communes[0];
    console.log(
      `✅ Commune trouvée: ${cotoneauCommune.nom} (ID: ${cotoneauCommune.id})\n`,
    );

    // Étape 2: Supprimer les anciens arrondissements de Cotonou
    console.log(
      "🗑️  Étape 2: Suppression des anciens arrondissements de Cotonou...",
    );
    const { data: deletedCount, error: deleteError } = await supabase
      .from("arrondissements")
      .delete()
      .eq("commune_id", cotoneauCommune.id);

    if (deleteError) {
      throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
    }

    console.log(`✅ Arrondissements supprimés\n`);

    // Étape 3: Préparer les nouveaux arrondissements
    console.log("📝 Étape 3: Préparation des 12 nouveaux arrondissements...");
    const arronDisementsAInserer = arronDisementsCotonouCoriges.map((arr) => ({
      nom: arr.nom,
      commune_id: cotoneauCommune.id,
      geom: `SRID=4326;POINT(${arr.longitude} ${arr.latitude})`,
    }));

    console.log(
      `✅ ${arronDisementsAInserer.length} arrondissements préparés\n`,
    );

    // Étape 4: Insérer les nouveaux arrondissements par batch
    console.log("💾 Étape 4: Insertion des nouveaux arrondissements...");
    let totalInserted = 0;

    for (let i = 0; i < arronDisementsAInserer.length; i += 50) {
      const batch = arronDisementsAInserer.slice(i, i + 50);
      const { data, error } = await supabase
        .from("arrondissements")
        .insert(batch)
        .select();

      if (error) {
        throw new Error(
          `Erreur lors de l'insertion batch ${i / 50 + 1}: ${error.message}`,
        );
      }

      totalInserted += batch.length;
      console.log(
        `   ✅ Batch ${Math.floor(i / 50) + 1}: ${batch.length} arrondissements insérés`,
      );
    }

    console.log(
      `\n✅ Total: ${totalInserted}/${arronDisementsAInserer.length} arrondissements insérés avec succès\n`,
    );

    // Étape 5: Vérifier les données
    console.log("🔍 Étape 5: Vérification des données...");
    const { data: verifyData, error: verifyError } = await supabase
      .from("arrondissements")
      .select("id, nom, commune_id")
      .eq("commune_id", cotoneauCommune.id);

    if (verifyError) {
      throw new Error(`Erreur lors de la vérification: ${verifyError.message}`);
    }

    console.log(
      `✅ Vérification: ${verifyData.length} arrondissements trouvés en base\n`,
    );

    console.log("=".repeat(60));
    console.log("🎉 Correction complétée avec succès !");
    console.log("=".repeat(60));
    console.log("\n📊 Résumé:");
    console.log(`   • Commune: ${cotoneauCommune.nom}`);
    console.log(`   • Arrondissements insérés: ${totalInserted}`);
    console.log(
      `   • Vérification en base: ${verifyData.length} arrondissements`,
    );
    console.log(
      '\n💡 Testez avec: curl "http://localhost:5000/api/administrative-location?latitude=6.3654&longitude=2.4183"',
    );
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

fixCotenovemArrondissements();
