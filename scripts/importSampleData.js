const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

// Mapping des catégories de l'ancien format vers le nouveau
const categoryMapping = {
  "Toilettes publiques": "toilettes_publiques",
  "Aires de jeux": "parc_jeux",
  "Terrains de sport": "installation_sportive",
  "Centres de santé": "centre_sante",
  Écoles: "autre",
  Mairies: "autre",
  Commissariats: "autre",
  Marchés: "autre",
  "Espaces verts": "parc_jeux",
  "Centres culturels": "espace_divertissement",
  Arrondissements: "autre",
};

// Fonction pour convertir les horaires
function convertOpeningHours(opening_hours) {
  if (!opening_hours) return {};

  const daysMapping = {
    monday: "lundi",
    tuesday: "mardi",
    wednesday: "mercredi",
    thursday: "jeudi",
    friday: "vendredi",
    saturday: "samedi",
    sunday: "dimanche",
  };

  const horaires = {};

  Object.entries(opening_hours).forEach(([englishDay, horaire]) => {
    const frenchDay = daysMapping[englishDay.toLowerCase()];

    if (horaire === "Fermé" || horaire === "fermé") {
      horaires[frenchDay] = {
        ouvert: false,
        debut: null,
        fin: null,
      };
    } else if (horaire === "24h/24") {
      horaires[frenchDay] = {
        ouvert: true,
        debut: "00:00",
        fin: "23:59",
      };
    } else {
      // Format: "08:00-16:00"
      const times = horaire.split("-");
      horaires[frenchDay] = {
        ouvert: true,
        debut: times[0] || "09:00",
        fin: times[1] || "17:00",
      };
    }
  });

  return horaires;
}

// Fonction pour extraire le quartier et la commune de l'adresse
function parseAddress(address) {
  if (!address) return { adresse: "", quartier: "", commune: "Cotonou" };

  const parts = address.split(",").map((p) => p.trim());

  return {
    adresse: address,
    quartier: parts[0] || "",
    commune: parts[1] || "Cotonou",
  };
}

// Fonction principale d'import
async function importData() {
  console.log("🚀 Début de l'importation des données...\n");

  // Chemin vers le fichier JSON
  const jsonPath = path.join(
    __dirname,
    "../../../localisation/assets/data/sample_infrastructures.json"
  );

  // Vérifier si le fichier existe
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable: ${jsonPath}`);
    console.log("💡 Assurez-vous que le chemin est correct.");
    process.exit(1);
  }

  // Lire le fichier
  const rawData = fs.readFileSync(jsonPath, "utf8");
  const infrastructures = JSON.parse(rawData);

  console.log(
    `📊 ${infrastructures.length} infrastructures trouvées dans le fichier\n`
  );

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Traiter chaque infrastructure
  for (const infra of infrastructures) {
    try {
      const addressInfo = parseAddress(infra.address);

      // Transformer les données au nouveau format
      const newInfra = {
        nom: infra.name,
        type: categoryMapping[infra.category] || "autre",
        description: infra.description || "",
        localisation: {
          type: "Point",
          coordinates: [infra.longitude, infra.latitude], // [longitude, latitude]
          adresse: addressInfo.adresse,
          quartier: addressInfo.quartier,
          commune: addressInfo.commune,
        },
        photos: infra.images
          ? infra.images.map((url) => ({ url, uploadedAt: new Date() }))
          : [],
        horaires: convertOpeningHours(infra.opening_hours),
        equipements: [],
        accessibilite: {
          pmr: infra.is_accessible || false,
          enfants: true,
        },
        contact: {
          telephone: infra.phone || null,
          email: null,
          website: infra.website || null,
        },
        etat: "bon",
        note_moyenne: infra.rating || 0,
        nombre_avis: infra.review_count || 0,
        niveau_frequentation: "moyen",
        valide: infra.is_verified !== undefined ? infra.is_verified : true,
        cree_par: null,
        valide_par: null,
        valide_le: infra.is_verified ? new Date() : null,
      };

      // Insérer dans Supabase
      const { data, error } = await supabase
        .from("infrastructures")
        .insert([newInfra])
        .select();

      if (error) {
        throw error;
      }

      successCount++;
      console.log(
        `✅ [${successCount}/${infrastructures.length}] ${infra.name}`
      );
    } catch (error) {
      errorCount++;
      const errorMsg = `❌ Erreur pour "${infra.name}": ${error.message}`;
      console.error(errorMsg);
      errors.push({ infrastructure: infra.name, error: error.message });
    }
  }

  // Résumé
  console.log("\n" + "=".repeat(60));
  console.log("📈 RÉSUMÉ DE L'IMPORTATION");
  console.log("=".repeat(60));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📊 Total: ${infrastructures.length}`);

  if (errors.length > 0) {
    console.log("\n❌ DÉTAILS DES ERREURS:");
    errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err.infrastructure}: ${err.error}`);
    });
  }

  if (successCount === infrastructures.length) {
    console.log("\n🎉 TOUTES LES DONNÉES ONT ÉTÉ IMPORTÉES AVEC SUCCÈS !");
    console.log("\n💡 Vous pouvez maintenant supprimer le fichier JSON:");
    console.log(`   ${jsonPath}`);
  }

  console.log("\n✅ Script terminé\n");
  process.exit(errorCount > 0 ? 1 : 0);
}

// Exécuter le script
importData().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
