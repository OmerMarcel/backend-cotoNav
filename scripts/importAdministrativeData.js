const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

/**
 * Fonction pour créer/récupérer un département
 */
async function getOrCreateDepartement(nom) {
  try {
    // Chercher le département existant
    const { data, error } = await supabase
      .from("departements")
      .select("id")
      .eq("nom", nom)
      .single();

    if (data && data.id) {
      return data.id;
    }

    // Si n'existe pas, créer
    if (error && error.code === "PGRST116") {
      // Pas de résultats
      const { data: newDept, error: createError } = await supabase
        .from("departements")
        .insert([{ nom }])
        .select()
        .single();

      if (createError) throw createError;
      return newDept.id;
    }

    throw error;
  } catch (error) {
    console.error(`Erreur avec le département "${nom}":`, error.message);
    throw error;
  }
}

/**
 * Fonction pour créer/récupérer une commune
 */
async function getOrCreateCommune(nom, departement_id) {
  try {
    const { data, error } = await supabase
      .from("communes")
      .select("id")
      .eq("nom", nom)
      .eq("departement_id", departement_id)
      .single();

    if (data && data.id) {
      return data.id;
    }

    if (error && error.code === "PGRST116") {
      const { data: newComm, error: createError } = await supabase
        .from("communes")
        .insert([{ nom, departement_id }])
        .select()
        .single();

      if (createError) throw createError;
      return newComm.id;
    }

    throw error;
  } catch (error) {
    console.error(`Erreur avec la commune "${nom}":`, error.message);
    throw error;
  }
}

/**
 * Fonction principale d'import des données administratives
 */
async function importAdministrativeData() {
  console.log("🚀 Début de l'importation des données administratives...\n");

  // Chemins vers les fichiers JSON
  const positionsPath =
    "C:\\Users\\HP\\Downloads\\positions_administratives.json";
  const departementsPath = "C:\\Users\\HP\\Downloads\\departements_benin.json";

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // =====================================
    // 1. D'ABORD, IMPORTER LES DÉPARTEMENTS
    // =====================================
    console.log("\n📍 IMPORT DES DÉPARTEMENTS\n");

    const departements = {};

    if (fs.existsSync(departementsPath)) {
      const departementsData = JSON.parse(
        fs.readFileSync(departementsPath, "utf8"),
      );

      if (
        departementsData.departements &&
        Array.isArray(departementsData.departements)
      ) {
        console.log(
          `📊 ${departementsData.departements.length} départements trouvés\n`,
        );

        for (const departement of departementsData.departements) {
          try {
            const deptId = await getOrCreateDepartement(departement.nom);
            departements[departement.nom] = deptId;
            successCount++;
            console.log(`✅ Département: ${departement.nom}`);
          } catch (error) {
            errorCount++;
            console.error(
              `❌ Erreur pour département ${departement.nom}:`,
              error.message,
            );
            errors.push({
              item: `Département - ${departement.nom}`,
              error: error.message,
            });
          }
        }
      }
    } else {
      console.log(`⚠️ Fichier introuvable: ${departementsPath}`);
    }

    // =====================================
    // 2. IMPORTER LES COMMUNES
    // =====================================
    console.log("\n\n🏘️ IMPORT DES COMMUNES\n");

    const communes = {};

    if (fs.existsSync(departementsPath)) {
      const departementsData = JSON.parse(
        fs.readFileSync(departementsPath, "utf8"),
      );

      if (
        departementsData.departements &&
        Array.isArray(departementsData.departements)
      ) {
        for (const departement of departementsData.departements) {
          if (departement.communes && Array.isArray(departement.communes)) {
            console.log(
              `📌 ${departement.nom}: ${departement.communes.length} communes`,
            );

            for (const commune of departement.communes) {
              try {
                const commId = await getOrCreateCommune(
                  commune.nom,
                  departements[departement.nom],
                );
                communes[commune.nom] = {
                  id: commId,
                  departement_id: departements[departement.nom],
                  population: commune.population,
                };
                successCount++;
                console.log(`  ✅ ${commune.nom}`);
              } catch (error) {
                errorCount++;
                console.error(
                  `  ❌ Erreur pour commune ${commune.nom}:`,
                  error.message,
                );
                errors.push({
                  item: `Commune - ${commune.nom}`,
                  error: error.message,
                });
              }
            }
          }
        }
      }
    }

    // =====================================
    // 3. IMPORTER LES ARRONDISSEMENTS
    // =====================================
    console.log("\n\n📍 IMPORT DES ARRONDISSEMENTS\n");

    if (fs.existsSync(positionsPath)) {
      const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

      if (
        positionsData.arrondissements &&
        Array.isArray(positionsData.arrondissements)
      ) {
        console.log(
          `📊 ${positionsData.arrondissements.length} arrondissements trouvés\n`,
        );

        for (const arrondissement of positionsData.arrondissements) {
          try {
            // Trouver la commune (basée sur le nom ou adresse)
            const commune_id = communes[arrondissement.commune]?.id;

            if (!commune_id) {
              throw new Error(`Commune non trouvée: ${arrondissement.commune}`);
            }

            const { data, error } = await supabase
              .from("arrondissements")
              .insert([
                {
                  nom: arrondissement.nom || "",
                  commune_id,
                  latitude: arrondissement.latitude || 0,
                  longitude: arrondissement.longitude || 0,
                  adresse: arrondissement.adresse || "",
                  observations: arrondissement.observations || "",
                  geom: `POINT(${arrondissement.longitude || 0} ${arrondissement.latitude || 0})`,
                },
              ])
              .select();

            if (error) throw error;

            successCount++;
            console.log(`✅ Arrondissement: ${arrondissement.nom || "?"}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erreur pour arrondissement:`, error.message);
            errors.push({
              item: `Arrondissement - ${arrondissement.nom}`,
              error: error.message,
            });
          }
        }
      }
    } else {
      console.log(`⚠️ Fichier introuvable: ${positionsPath}`);
    }

    // =====================================
    // 4. IMPORTER LES MAIRIES
    // =====================================
    console.log("\n\n🏛️ IMPORT DES MAIRIES\n");

    if (fs.existsSync(positionsPath)) {
      const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

      if (
        positionsData.hotels_de_ville &&
        Array.isArray(positionsData.hotels_de_ville)
      ) {
        console.log(
          `📊 ${positionsData.hotels_de_ville.length} mairies trouvées\n`,
        );

        for (const mairie of positionsData.hotels_de_ville) {
          try {
            const commune_id = communes[mairie.commune]?.id;

            if (!commune_id) {
              throw new Error(`Commune non trouvée: ${mairie.commune}`);
            }

            const { data, error } = await supabase
              .from("mairies")
              .insert([
                {
                  nom: mairie.nom || "",
                  commune_id,
                  latitude: mairie.latitude || 0,
                  longitude: mairie.longitude || 0,
                  adresse: mairie.adresse || "",
                  observations: mairie.observations || "",
                  geom: `POINT(${mairie.longitude || 0} ${mairie.latitude || 0})`,
                },
              ])
              .select();

            if (error) throw error;

            successCount++;
            console.log(`✅ Mairie: ${mairie.nom || "?"}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erreur pour mairie:`, error.message);
            errors.push({
              item: `Mairie - ${mairie.nom}`,
              error: error.message,
            });
          }
        }
      }
    }

    // =====================================
    // 5. IMPORTER LES PRÉFECTURES
    // =====================================
    console.log("\n\n👑 IMPORT DES PRÉFECTURES\n");

    if (fs.existsSync(positionsPath)) {
      const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

      if (
        positionsData.prefectures &&
        Array.isArray(positionsData.prefectures)
      ) {
        console.log(
          `📊 ${positionsData.prefectures.length} préfectures trouvées\n`,
        );

        for (const prefecture of positionsData.prefectures) {
          try {
            const departement_id =
              departements[prefecture.departement] ||
              departements[Object.keys(departements)[0]];

            const { data, error } = await supabase
              .from("prefectures")
              .insert([
                {
                  nom: prefecture.nom || "",
                  departement_id,
                  latitude: prefecture.latitude || 0,
                  longitude: prefecture.longitude || 0,
                  adresse: prefecture.adresse || "",
                  observations: prefecture.observations || "",
                  geom: `POINT(${prefecture.longitude || 0} ${prefecture.latitude || 0})`,
                },
              ])
              .select();

            if (error) throw error;

            successCount++;
            console.log(`✅ Préfecture: ${prefecture.nom || "?"}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erreur pour préfecture:`, error.message);
            errors.push({
              item: `Préfecture - ${prefecture.nom}`,
              error: error.message,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  }

  // =====================================
  // RÉSUMÉ FINAL
  // =====================================
  console.log("\n" + "=".repeat(70));
  console.log("📈 RÉSUMÉ COMPLET DE L'IMPORTATION DES DONNÉES ADMINISTRATIVES");
  console.log("=".repeat(70));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📊 Total traité: ${successCount + errorCount}`);

  if (errors.length > 0) {
    console.log("\n❌ DÉTAILS DES ERREURS:");
    errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err.item}`);
      console.log(`   └─ ${err.error}`);
    });
  }

  if (errorCount === 0 && successCount > 0) {
    console.log(
      "\n🎉 TOUTES LES DONNÉES ADMINISTRATIVES ONT ÉTÉ IMPORTÉES AVEC SUCCÈS !",
    );
  }

  console.log("\n✅ Script terminé\n");
  process.exit(errorCount > 0 ? 1 : 0);
}

// Exécuter le script
importAdministrativeData().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
