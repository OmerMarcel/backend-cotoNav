const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

/**
 * Normaliser un nom pour le matching (sans accents, majuscules, espaces)
 */
function normalizeString(str) {
  if (!str) return "";
  return str
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * Trouve une commune par nom normalisé
 */
function findCommune(communeName, communesMap) {
  const normalized = normalizeString(communeName);

  // Recherche exacte
  if (communesMap[normalized]) {
    return communesMap[normalized];
  }

  // Recherche partielle (contient)
  for (const [key, value] of Object.entries(communesMap)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Fonction principale
 */
async function importAdministrativeDataV3() {
  console.log("🚀 Début de l'importation V3 (avec PostGIS corrigé)...\n");

  const positionsPath =
    "C:\\Users\\HP\\Downloads\\positions_administratives.json";
  const departementsPath = "C:\\Users\\HP\\Downloads\\departements_benin.json";

  let successCount = 0;
  let errorCount = 0;

  try {
    // =====================================
    // CHARGER TOUTES LES COMMUNES EN MÉMOIRE
    // =====================================
    console.log("📥 Chargement des communes depuis la base...\n");

    const { data: allCommunes, error: communesError } = await supabase.from(
      "communes",
    ).select(`
        id,
        nom,
        departement_id,
        departements!inner(nom)
      `);

    if (communesError) throw communesError;

    // Créer un map pour recherche rapide
    const communesMap = {};
    allCommunes.forEach((c) => {
      const key = normalizeString(c.nom);
      communesMap[key] = {
        id: c.id,
        nom: c.nom,
        departement_id: c.departement_id,
        departement_nom: c.departements?.nom,
      };
    });

    console.log(`✅ ${allCommunes.length} communes chargées\n`);
    console.log(
      "Communes disponibles:",
      Object.values(communesMap)
        .map((c) => c.nom)
        .slice(0, 10)
        .join(", "),
      "...\n",
    );

    // =====================================
    // IMPORTER ARRONDISSEMENTS
    // =====================================
    console.log("📍 IMPORT DES ARRONDISSEMENTS\n");

    if (!fs.existsSync(positionsPath)) {
      throw new Error(`Fichier introuvable: ${positionsPath}`);
    }

    const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

    if (
      !positionsData.arrondissements ||
      !Array.isArray(positionsData.arrondissements)
    ) {
      throw new Error("Format JSON invalide: pas de tableau 'arrondissements'");
    }

    console.log(
      `📊 ${positionsData.arrondissements.length} arrondissements à importer\n`,
    );

    for (const arr of positionsData.arrondissements) {
      try {
        // Trouver la commune
        const commune = findCommune(arr.commune, communesMap);

        if (!commune) {
          throw new Error(`Commune non trouvée: ${arr.commune}`);
        }

        // Vérifier que les coordonnées sont valides
        const lat = parseFloat(arr.latitude);
        const lon = parseFloat(arr.longitude);

        if (isNaN(lat) || isNaN(lon)) {
          throw new Error(`Coordonnées invalides: ${lat}, ${lon}`);
        }

        // Utiliser la fonction RPC PostgreSQL pour insérer avec géométrie
        const { data, error } = await supabase.rpc("insert_arrondissement", {
          p_nom: arr.nom || "Arrondissement inconnu",
          p_commune_id: commune.id,
          p_latitude: lat,
          p_longitude: lon,
          p_adresse: arr.adresse || "",
          p_observations: arr.observations || "",
        });

        if (error) throw error;

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ ${successCount} arrondissements importés...`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 10) {
          // Limiter les logs d'erreur
          console.error(`❌ ${arr.nom}: ${error.message}`);
        }
      }
    }

    // =====================================
    // IMPORTER MAIRIES
    // =====================================
    console.log("\n\n🏛️ IMPORT DES MAIRIES\n");

    if (
      positionsData.hotels_de_ville &&
      Array.isArray(positionsData.hotels_de_ville)
    ) {
      console.log(
        `📊 ${positionsData.hotels_de_ville.length} mairies à importer\n`,
      );

      for (const mairie of positionsData.hotels_de_ville) {
        try {
          const commune = findCommune(mairie.commune, communesMap);

          if (!commune) {
            throw new Error(`Commune non trouvée: ${mairie.commune}`);
          }

          const lat = parseFloat(mairie.latitude);
          const lon = parseFloat(mairie.longitude);

          if (isNaN(lat) || isNaN(lon)) {
            throw new Error(`Coordonnées invalides`);
          }

          const { data, error } = await supabase.rpc("insert_mairie", {
            p_nom: mairie.nom || commune.nom,
            p_commune_id: commune.id,
            p_latitude: lat,
            p_longitude: lon,
            p_adresse: mairie.adresse || "",
            p_observations: mairie.observations || "",
          });

          if (error) throw error;

          successCount++;
          console.log(`✅ ${mairie.nom || commune.nom}`);
        } catch (error) {
          errorCount++;
          if (errorCount <= 10) {
            console.error(`❌ ${mairie.nom}: ${error.message}`);
          }
        }
      }
    }

    // =====================================
    // RÉSUMÉ
    // =====================================
    console.log(
      "\n======================================================================",
    );
    console.log("📈 RÉSUMÉ DE L'IMPORTATION");
    console.log(
      "======================================================================",
    );
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📊 Total traité: ${successCount + errorCount}`);
    console.log("\n✅ Script terminé\n");

    // Vérification finale
    const { data: arrCount } = await supabase
      .from("arrondissements")
      .select("id", { count: "exact", head: true });

    console.log(
      `🔍 Vérification: ${arrCount?.length || 0} arrondissements en base\n`,
    );
  } catch (error) {
    console.error("\n❌ ERREUR FATALE:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter
importAdministrativeDataV3()
  .then(() => {
    console.log("🎉 Import terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Échec de l'import:", error);
    process.exit(1);
  });
