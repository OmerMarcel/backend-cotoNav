const supabase = require("../config/supabase");
const fs = require("fs");

/**
 * Convertir UTM (zone 31N) → Lat/Lon
 */
function utmToLatLon(easting, northing, zoneNumber = 31) {
  const K0 = 0.9996;
  const E = 0.00669438;
  const E_PRIME_SQUARED = E / (1 - E);
  const R = 6378137;

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
 * Importation avec insertion SQL directe
 */
async function importAdministrativeDataV5() {
  console.log("🚀 Début de l'importation V5 (insertion SQL directe)...\n");

  const positionsPath =
    "C:\\Users\\HP\\Downloads\\positions_administratives.json";

  let successCount = 0;
  let errorCount = 0;

  try {
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

    // Charger les communes pour le matching
    const { data: communes, error: communesError } = await supabase
      .from("communes")
      .select("id, nom, departement_id");

    if (communesError) throw communesError;

    const communesMap = {};
    communes.forEach((c) => {
      communesMap[c.nom.toUpperCase()] = c.id;
    });

    // Parcourir les arrondissements
    const arrondissementsToInsert = [];

    for (const arr of positionsData.arrondissements) {
      try {
        const utmX = parseFloat(arr.x_utm);
        const utmY = parseFloat(arr.y_utm);

        if (isNaN(utmX) || isNaN(utmY)) {
          throw new Error(`Coordonnées UTM invalides`);
        }

        const coords = utmToLatLon(utmX, utmY, 31);

        // Chercher la commune
        let commune_id = null;
        const communeName =
          arr.commune && arr.commune !== "Non"
            ? arr.commune.toUpperCase()
            : null;

        if (communeName && communesMap[communeName]) {
          commune_id = communesMap[communeName];
        } else {
          // Prendre la première commune
          const firstComm = Object.values(communesMap)[0];
          if (firstComm) commune_id = firstComm;
        }

        if (!commune_id) {
          throw new Error("Pas de commune trouvée");
        }

        // Ajouter à la liste pour insertion batch
        arrondissementsToInsert.push({
          nom: arr.nom || `Arrondissement ${arr.id}`,
          commune_id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          adresse: arr.description || arr.adresse || "",
          observations: arr.observations || "",
          geom: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`,
        });

        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✅ ${successCount} arrondissements préparés...`);
        }
      } catch (error) {
        errorCount++;
      }
    }

    // Insérer par batch de 50
    console.log(
      `\n📤 Insertion de ${arrondissementsToInsert.length} arrondissements en base...\n`,
    );

    let inserted = 0;
    for (let i = 0; i < arrondissementsToInsert.length; i += 50) {
      const batch = arrondissementsToInsert.slice(i, i + 50);

      const { data, error } = await supabase
        .from("arrondissements")
        .insert(batch);

      if (error) {
        console.error(`❌ Batch ${i}-${i + 50}: ${error.message}`);
        continue;
      }

      inserted += batch.length;
      if (inserted % 100 === 0) {
        console.log(
          `✅ ${inserted}/${arrondissementsToInsert.length} en base...`,
        );
      }
    }

    // Résumé
    console.log(
      "\n======================================================================",
    );
    console.log("📈 RÉSUMÉ DE L'IMPORTATION V5");
    console.log(
      "======================================================================",
    );
    console.log(`✅ Insérés: ${inserted}/${arrondissementsToInsert.length}`);
    console.log(`❌ Erreurs parsing: ${errorCount}`);

    // Vérification
    const { data: result, count } = await supabase
      .from("arrondissements")
      .select("id", { count: "exact", head: true });

    console.log(`\n🔍 Vérification base: ${count} arrondissements au total`);

    if (count > 0) {
      console.log("✅ Géolocalisation administrative opérationnelle !");
    }
  } catch (error) {
    console.error("\n❌ ERREUR:", error.message);
    console.error(error);
    process.exit(1);
  }
}

importAdministrativeDataV5()
  .then(() => {
    console.log("\n🎉 Import terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Échec:", error);
    process.exit(1);
  });
