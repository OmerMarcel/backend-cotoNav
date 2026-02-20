const supabase = require("../config/supabase");
const fs = require("fs");

/**
 * Convertir UTM (zone 31N) → Lat/Lon
 * Utilisant la formule de conversion standard
 */
function utmToLatLon(easting, northing, zoneNumber = 31) {
  const K0 = 0.9996;
  const E = 0.00669438;
  const E_PRIME_SQUARED = E / (1 - E);
  const R = 6378137; // Earth's radius in meters (WGS84)

  const X = easting - 500000;
  const Y = northing;

  const M = Y / K0;
  const MU = M / (R * (1 - E / 4 - (3 * E * E) / 64 - (5 * E * E * E) / 256));

  const PHI_1 =
    MU +
    (3 / 2) * (0.0033356700665 * Math.sin(2 * MU)) +
    (21 / 16) * (0.0033356700665 * 0.0033356700665) * Math.sin(4 * MU);

  const C1 = E_PRIME_SQUARED * Math.pow(Math.cos(PHI_1), 2);
  const T1 = Math.pow(Math.tan(PHI_1), 2);
  const N1 = R / Math.sqrt(1 - E * Math.pow(Math.sin(PHI_1), 2));
  const R1 =
    (R * (1 - E)) /
    Math.sqrt(Math.pow(1 - E * Math.pow(Math.sin(PHI_1), 2), 3));
  const D = X / (N1 * K0);

  const D_SQUARED = D * D;
  const D_CUBED = D_SQUARED * D;
  const D_FOURTH = D_CUBED * D;
  const D_FIFTH = D_FOURTH * D;
  const D_SIXTH = D_FIFTH * D;

  const LAT =
    PHI_1 -
    ((T1 + C1) * D_SQUARED) / 2 +
    ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * E_PRIME_SQUARED) * D_FOURTH) /
      24 -
    ((61 + 90 * T1 + 28 * (T1 * T1) + 45 * C1 - 252 * E_PRIME_SQUARED) *
      D_SIXTH) /
      720;

  const LON =
    (D -
      ((1 + 2 * T1 + C1) * D_CUBED) / 6 +
      ((5 -
        2 * C1 +
        28 * T1 -
        3 * (C1 * C1) +
        8 * E_PRIME_SQUARED +
        24 * (T1 * T1)) *
        D_FIFTH) /
        120) /
    Math.cos(PHI_1);

  const LON_ORIGIN = ((zoneNumber - 1) * 6 - 180 + 3) * (Math.PI / 180);

  return {
    latitude: LAT * (180 / Math.PI),
    longitude: (LON_ORIGIN + LON) * (180 / Math.PI),
  };
}

/**
 * Fonction principale
 */
async function importAdministrativeDataV4() {
  console.log(
    "🚀 Début de l'importation V4 (avec conversion UTM → Lat/Lon)...\n",
  );

  const positionsPath =
    "C:\\Users\\HP\\Downloads\\positions_administratives.json";

  let successCount = 0;
  let errorCount = 0;
  let conversionErrors = 0;

  try {
    // Charger les données
    if (!fs.existsSync(positionsPath)) {
      throw new Error(`Fichier introuvable: ${positionsPath}`);
    }

    const positionsData = JSON.parse(fs.readFileSync(positionsPath, "utf8"));

    if (
      !positionsData.arrondissements ||
      !Array.isArray(positionsData.arrondissements)
    ) {
      throw new Error("Format JSON invalide");
    }

    console.log(
      `📍 Conversion et import de ${positionsData.arrondissements.length} arrondissements\n`,
    );

    for (const arr of positionsData.arrondissements) {
      try {
        // Valider les coordonnées UTM
        const utmX = parseFloat(arr.x_utm);
        const utmY = parseFloat(arr.y_utm);

        if (isNaN(utmX) || isNaN(utmY)) {
          throw new Error(`Coordonnées UTM invalides: ${utmX}, ${utmY}`);
        }

        // Convertir UTM → Lat/Lon (zone 31N pour Bénin)
        const coords = utmToLatLon(utmX, utmY, 31);

        // Chercher une commune libre ou créer une commune générique
        let commune_id = null;
        const communeName =
          arr.commune && arr.commune !== "Non"
            ? arr.commune.toUpperCase()
            : null;

        if (communeName) {
          // Chercher la commune
          const { data: communes } = await supabase
            .from("communes")
            .select("id")
            .ilike("nom", `%${communeName}%`)
            .limit(1);

          if (communes && communes.length > 0) {
            commune_id = communes[0].id;
          }
        }

        // Si pas trouvé, utiliser la première commune disponible (solution provisoire)
        if (!commune_id) {
          const { data: comms } = await supabase
            .from("communes")
            .select("id")
            .limit(1);

          if (comms && comms.length > 0) {
            commune_id = comms[0].id;
          }
        }

        if (!commune_id) {
          throw new Error("Pas de commune disponible en base");
        }

        // Insérer l'arrondissement via RPC
        const { data, error } = await supabase.rpc("insert_arrondissement", {
          p_nom: arr.nom || `Arrondissement ${arr.id}`,
          p_commune_id: commune_id,
          p_latitude: coords.latitude,
          p_longitude: coords.longitude,
          p_adresse: arr.description || arr.adresse || "",
          p_observations: arr.observations || "",
        });

        if (error) {
          console.error(`❌ RPC Error: ${error.message}`, error);
          throw error;
        }

        if (!data) {
          throw new Error(`RPC returned null/undefined`);
        }

        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✅ ${successCount} arrondissements importés...`);
        }
      } catch (error) {
        errorCount++;
        conversionErrors++;
        if (errorCount <= 10) {
          console.error(`❌ ${arr.nom}: ${error.message}`);
        }
      }
    }

    // Résumé
    console.log(
      "\n======================================================================",
    );
    console.log("📈 RÉSUMÉ DE L'IMPORTATION V4");
    console.log(
      "======================================================================",
    );
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📊 Total traité: ${successCount + errorCount}`);
    console.log(`🔄 Conversions UTM: ${successCount}`);

    // Vérification finale
    const { data: result } = await supabase
      .from("arrondissements")
      .select("id", { count: "exact", head: true });

    const count = result?.length || 0;
    console.log(
      `\n🔍 Vérification: ${count} arrondissements en base avec géométrie`,
    );

    if (count > 0) {
      console.log("✅ Géolocalisation administrative opérationnelle !");
    }
  } catch (error) {
    console.error("\n❌ ERREUR FATALE:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter
importAdministrativeDataV4()
  .then(() => {
    console.log("\n🎉 Import terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Échec de l'import:", error);
    process.exit(1);
  });
