// Utilise la même config que le backend
const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

async function fixCotoneauArrondissements() {
  try {
    console.log("🔄 Correction des arrondissements de Cotonou\n");

    // Étape 1: Trouver la commune Cotonou
    console.log("📍 Étape 1: Recherche de la commune Cotonou...");
    const { data: communes, error: err1 } = await supabase
      .from("communes")
      .select("id, nom")
      .ilike("nom", "%cotonou%")
      .limit(1);

    if (err1) throw err1;
    if (!communes || communes.length === 0)
      throw new Error("Commune Cotonou non trouvée");

    const cotonou = communes[0];
    console.log(`✅ Found: ${cotonou.nom} (ID: ${cotonou.id})\n`);

    // Étape 2: Supprimer les anciens arrondissements
    console.log("🗑️  Étape 2: Suppression des anciens arrondissements...");
    const { error: err2 } = await supabase
      .from("arrondissements")
      .delete()
      .eq("commune_id", cotonou.id);

    if (err2) throw err2;
    console.log("✅ Suppression terminée\n");

    // Étape 3-4: Insérer les 12 nouveaux arrondissements
    const arrondissements = [
      { nom: "1er arrondissement de Cotonou", lat: 6.3725, lon: 2.476667 },
      { nom: "2e arrondissement de Cotonou", lat: 6.386667, lon: 2.4625 },
      { nom: "3e arrondissement de Cotonou", lat: 6.382222, lon: 2.443333 },
      { nom: "4e arrondissement de Cotonou", lat: 6.370361, lon: 2.446111 },
      { nom: "5e arrondissement de Cotonou", lat: 6.369444, lon: 2.394167 },
      { nom: "6e arrondissement de Cotonou", lat: 6.368056, lon: 2.426111 },
      { nom: "7e arrondissement de Cotonou", lat: 6.368056, lon: 2.426111 },
      { nom: "8e arrondissement de Cotonou", lat: 6.381944, lon: 2.411389 },
      { nom: "9e arrondissement de Cotonou", lat: 6.370556, lon: 2.392222 },
      { nom: "10e arrondissement de Cotonou", lat: 6.391667, lon: 2.385278 },
      { nom: "11e arrondissement de Cotonou", lat: 6.369167, lon: 2.386667 },
      { nom: "12e arrondissement de Cotonou", lat: 6.369167, lon: 2.386667 },
    ];

    console.log("💾 Étape 3: Insertion des 12 nouveaux arrondissements...");

    const toInsert = arrondissements.map((arr) => ({
      nom: arr.nom,
      commune_id: cotonou.id,
      geom: `SRID=4326;POINT(${arr.lon} ${arr.lat})`,
    }));

    const { data: inserted, error: err3 } = await supabase
      .from("arrondissements")
      .insert(toInsert)
      .select();

    if (err3) throw err3;
    console.log(`✅ ${inserted.length} arrondissements insérés\n`);

    // Étape 5: Vérification
    console.log("🔍 Étape 5: Vérification des données...");
    const { data: verify, error: err4 } = await supabase
      .from("arrondissements")
      .select("nom")
      .eq("commune_id", cotonou.id);

    if (err4) throw err4;
    console.log(`✅ ${verify.length} arrondissements vérifiés\n`);

    console.log("=".repeat(60));
    console.log("🎉 Correction complétée avec succès !");
    console.log("=".repeat(60));

    console.log("\n📊 Résumé:");
    console.log(`  • Commune: ${cotonou.nom}`);
    console.log(`  • Arrondissements insérés: ${inserted.length}`);
    console.log(`  • Vérification en base: ${verify.length}`);

    console.log("\n📋 Liste des arrondissements:");
    verify.forEach((arr, idx) => {
      console.log(`  ${idx + 1}. ${arr.nom}`);
    });

    console.log(
      '\n💡 Test API: curl "http://localhost:5000/api/administrative-location?latitude=6.3654&longitude=2.4183"',
    );
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

fixCotoneauArrondissements();
