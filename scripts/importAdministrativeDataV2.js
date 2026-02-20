const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

/**
 * Fonction pour obtenir ou créer un département
 */
async function getOrCreateDepartement(nom) {
  try {
    // Chercher le département
    const { data, error } = await supabase
      .from("departements")
      .select("id")
      .eq("nom", nom)
      .single();

    if (data) return data.id;

    // Créer si n'existe pas
    const { data: newDept, error: createError } = await supabase
      .from("departements")
      .insert([{ nom }])
      .select()
      .single();

    if (createError) throw createError;
    return newDept.id;
  } catch (error) {
    throw error;
  }
}

/**
 * Fonction pour obtenir ou créer une commune
 */
async function getOrCreateCommune(nom, departement_id) {
  try {
    const { data, error } = await supabase
      .from("communes")
      .select("id")
      .eq("nom", nom)
      .eq("departement_id", departement_id)
      .single();

    if (data) return data.id;

    // Créer si n'existe pas
    const { data: newComm, error: createError } = await supabase
      .from("communes")
      .insert([{ nom, departement_id }])
      .select()
      .single();

    if (createError) throw createError;
    return newComm.id;
  } catch (error) {
    throw error;
  }
}

/**
 * Fonction principale
 */
async function importAdministrativeDataV2() {
  console.log("🚀 Début de l'importation V2 des données administratives...\n");

  const positionsPath =
    "C:\\Users\\HP\\Downloads\\positions_administratives.json";
  const departementsPath = "C:\\Users\\HP\\Downloads\\departements_benin.json";

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Mapping: nom commune -> département_id (construit au préalable)
  const communeToDepart = {};

  try {
    // =====================================
    // ÉTAPE 1: CRÉER TOUS LES DÉPARTEMENTS
    // =====================================
    console.log("📍 ÉTAPE 1: IMPORT DES DÉPARTEMENTS\n");

    if (!fs.existsSync(departementsPath)) {
      throw new Error(`Fichier introuvable: ${departementsPath}`);
    }

    const departementsData = JSON.parse(
      fs.readFileSync(departementsPath, "utf8"),
    );
    const departementIds = {};

    for (const dept of departementsData.departements) {
      try {
        const deptId = await getOrCreateDepartement(dept.nom);
        departementIds[dept.nom] = deptId;
        successCount++;
        console.log(`✅ Département: ${dept.nom}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Département ${dept.nom}:`, error.message);
        errors.push({
          item: `Département - ${dept.nom}`,
          error: error.message,
        });
      }
    }

    // =====================================
    // ÉTAPE 2: CRÉER TOUTES LES COMMUNES
    // =====================================
    console.log("\n\n🏘️ ÉTAPE 2: IMPORT DES COMMUNES\n");

    for (const dept of departementsData.departements) {
      if (dept.communes && Array.isArray(dept.communes)) {
        console.log(`📌 ${dept.nom}: ${dept.communes.length} communes`);

        for (const commune of dept.communes) {
          try {
            const commId = await getOrCreateCommune(
              commune.nom,
              departementIds[dept.nom],
            );

            // Enregistrer pour matching ultérieur
            communeToDepart[commune.nom] = {
              commune_id: commId,
              departement_id: departementIds[dept.nom],
              departement_nom: dept.nom,
            };

            successCount++;
            console.log(`  ✅ ${commune.nom}`);
          } catch (error) {
            errorCount++;
            console.error(`  ❌ ${commune.nom}:`, error.message);
            errors.push({
              item: `Commune - ${commune.nom}`,
              error: error.message,
            });
          }
        }
      }
    }

    // =====================================
    // ÉTAPE 3: IMPORTER ARRONDISSEMENTS
    // =====================================
    console.log("\n\n📍 ÉTAPE 3: IMPORT DES ARRONDISSEMENTS\n");

    if (!fs.existsSync(positionsPath)) {
      throw new Error(`Fichier introuvable: ${positionsPath}`);
    }

    const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

    if (
      positionsData.arrondissements &&
      Array.isArray(positionsData.arrondissements)
    ) {
      console.log(
        `📊 ${positionsData.arrondissements.length} arrondissements\n`,
      );

      for (const arr of positionsData.arrondissements) {
        try {
          // Essayer de matcher la commune
          let commune_id = null;

          // Chercher par nom de commune exact (uppercase)
          for (const [commNom, commData] of Object.entries(communeToDepart)) {
            if (commNom.toUpperCase() === (arr.commune || "").toUpperCase()) {
              commune_id = commData.commune_id;
              break;
            }
          }

          // Si pas trouvé, utiliser la première commune du département
          if (!commune_id && arr.departement) {
            const deptId = departementIds[arr.departement];
            if (deptId) {
              const { data: comms } = await supabase
                .from("communes")
                .select("id")
                .eq("departement_id", deptId)
                .limit(1);
              if (comms && comms.length > 0) {
                commune_id = comms[0].id;
              }
            }
          }

          if (!commune_id) {
            throw new Error(
              `Impossible de trouver une commune pour: ${arr.nom}`,
            );
          }

          const { error } = await supabase.from("arrondissements").insert([
            {
              nom: arr.nom || "",
              commune_id,
              latitude: arr.latitude || 0,
              longitude: arr.longitude || 0,
              adresse: arr.adresse || "",
              observations: arr.observations || "",
              geom:
                arr.latitude && arr.longitude
                  ? `POINT(${arr.longitude} ${arr.latitude})`
                  : null,
            },
          ]);

          if (error) throw error;

          successCount++;
          console.log(`✅ ${arr.nom}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ ${arr.nom}:`, error.message);
          errors.push({
            item: `Arrondissement - ${arr.nom}`,
            error: error.message,
          });
        }
      }
    }

    // =====================================
    // ÉTAPE 4: IMPORTER MAIRIES
    // =====================================
    console.log("\n\n🏛️ ÉTAPE 4: IMPORT DES MAIRIES\n");

    if (
      positionsData.hotels_de_ville &&
      Array.isArray(positionsData.hotels_de_ville)
    ) {
      console.log(`📊 ${positionsData.hotels_de_ville.length} mairies\n`);

      for (const mairie of positionsData.hotels_de_ville) {
        try {
          let commune_id = null;

          // Matcher la commune par nom
          for (const [commNom, commData] of Object.entries(communeToDepart)) {
            if (
              commNom.toUpperCase() === (mairie.commune || "").toUpperCase()
            ) {
              commune_id = commData.commune_id;
              break;
            }
          }

          // Fallback: matcher par le nom de la mairie
          if (!commune_id) {
            for (const [commNom, commData] of Object.entries(communeToDepart)) {
              if (commNom.toUpperCase() === (mairie.nom || "").toUpperCase()) {
                commune_id = commData.commune_id;
                break;
              }
            }
          }

          if (!commune_id) {
            // Chercher une commune par le nom
            const { data: comms } = await supabase
              .from("communes")
              .select("id")
              .ilike("nom", `%${mairie.nom}%`)
              .limit(1);

            if (comms && comms.length > 0) {
              commune_id = comms[0].id;
            }
          }

          if (!commune_id) {
            throw new Error(`Pas de commune trouvée pour: ${mairie.nom}`);
          }

          const { error } = await supabase.from("mairies").insert([
            {
              nom: mairie.nom || "",
              commune_id,
              latitude: mairie.latitude || 0,
              longitude: mairie.longitude || 0,
              adresse: mairie.adresse || "",
              observations: mairie.observations || "",
              geom:
                mairie.latitude && mairie.longitude
                  ? `POINT(${mairie.longitude} ${mairie.latitude})`
                  : null,
            },
          ]);

          if (error) throw error;

          successCount++;
          console.log(`✅ ${mairie.nom}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ ${mairie.nom}:`, error.message);
          errors.push({
            item: `Mairie - ${mairie.nom}`,
            error: error.message,
          });
        }
      }
    }

    // =====================================
    // ÉTAPE 5: IMPORTER PRÉFECTURES
    // =====================================
    console.log("\n\n👑 ÉTAPE 5: IMPORT DES PRÉFECTURES\n");

    if (positionsData.prefectures && Array.isArray(positionsData.prefectures)) {
      console.log(`📊 ${positionsData.prefectures.length} préfectures\n`);

      for (const pref of positionsData.prefectures) {
        try {
          // Matcher par nom de département
          let departement_id = null;
          for (const [deptNom, deptId] of Object.entries(departementIds)) {
            if (
              deptNom.toUpperCase() === (pref.nom || "").toUpperCase() ||
              deptNom.toUpperCase() === (pref.departement || "").toUpperCase()
            ) {
              departement_id = deptId;
              break;
            }
          }

          if (!departement_id) {
            throw new Error(`Département non trouvé pour: ${pref.nom}`);
          }

          const { error } = await supabase.from("prefectures").insert([
            {
              nom: pref.nom || "",
              departement_id,
              latitude: pref.latitude || 0,
              longitude: pref.longitude || 0,
              adresse: pref.adresse || "",
              observations: pref.observations || "",
              geom:
                pref.latitude && pref.longitude
                  ? `POINT(${pref.longitude} ${pref.latitude})`
                  : null,
            },
          ]);

          if (error) throw error;

          successCount++;
          console.log(`✅ ${pref.nom}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ ${pref.nom}:`, error.message);
          errors.push({
            item: `Préfecture - ${pref.nom}`,
            error: error.message,
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Erreur fatale:", error.message);
    process.exit(1);
  }

  // =====================================
  // RÉSUMÉ FINAL
  // =====================================
  console.log("\n" + "=".repeat(70));
  console.log("📈 RÉSUMÉ COMPLÈT DE L'IMPORTATION");
  console.log("=".repeat(70));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📊 Total traité: ${successCount + errorCount}`);

  if (errors.length > 0 && errors.length <= 20) {
    console.log("\n❌ DÉTAILS DES ERREURS:");
    errors.slice(0, 20).forEach((err, index) => {
      console.log(`${index + 1}. ${err.item}`);
      console.log(`   └─ ${err.error}`);
    });
    if (errors.length > 20) {
      console.log(`... et ${errors.length - 20} erreurs supplémentaires`);
    }
  }

  if (errorCount === 0 && successCount > 0) {
    console.log("\n🎉 TOUTES LES DONNÉES ONT ÉTÉ IMPORTÉES AVEC SUCCÈS !");
  }

  console.log("\n✅ Script terminé\n");
  process.exit(errorCount > 0 ? 1 : 0);
}

// Exécuter
importAdministrativeDataV2().catch((error) => {
  console.error("❌ Erreur:", error);
  process.exit(1);
});
