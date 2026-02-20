const supabase = require("../config/supabase");

class StatisticsService {
  async getGeneralStats() {
    try {
      const [
        { count: totalInfrastructures },
        { count: infrastructuresValidees },
        { count: infrastructuresEnAttente },
        { count: totalPropositions },
        { count: propositionsEnAttente },
        { count: totalSignalements },
        { count: signalementsNouveaux },
        { count: totalUsers },
        { count: totalAvis },
        { count: totalFavoris },
      ] = await Promise.all([
        supabase
          .from("infrastructures")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("infrastructures")
          .select("*", { count: "exact", head: true })
          .eq("valide", true),
        supabase
          .from("infrastructures")
          .select("*", { count: "exact", head: true })
          .eq("valide", false),
        supabase
          .from("propositions")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("propositions")
          .select("*", { count: "exact", head: true })
          .eq("statut", "en_attente"),
        supabase
          .from("signalements")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("signalements")
          .select("*", { count: "exact", head: true })
          .eq("statut", "nouveau"),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("avis").select("*", { count: "exact", head: true }),
        supabase
          .from("user_favorites")
          .select("*", { count: "exact", head: true }),
      ]);

      return {
        totalInfrastructures: totalInfrastructures || 0,
        infrastructuresValidees: infrastructuresValidees || 0,
        infrastructuresEnAttente: infrastructuresEnAttente || 0,
        totalPropositions: totalPropositions || 0,
        propositionsEnAttente: propositionsEnAttente || 0,
        totalSignalements: totalSignalements || 0,
        signalementsNouveaux: signalementsNouveaux || 0,
        totalUsers: totalUsers || 0,
        totalAvis: totalAvis || 0,
        totalFavoris: totalFavoris || 0,
      };
    } catch (error) {
      console.error("❌ Erreur dans getGeneralStats:", error.message);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        totalInfrastructures: 0,
        infrastructuresValidees: 0,
        infrastructuresEnAttente: 0,
        totalPropositions: 0,
        propositionsEnAttente: 0,
        totalSignalements: 0,
        signalementsNouveaux: 0,
        totalUsers: 0,
        totalAvis: 0,
        totalFavoris: 0,
      };
    }
  }

  async getInfrastructuresByType() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("type");

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error("❌ Erreur dans getInfrastructuresByType:", error.message);
      return [];
    }
  }

  async getInfrastructuresByQuartier() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        const quartier = item.localisation?.quartier || "Non spécifié";
        acc[quartier] = (acc[quartier] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (error) {
      console.error(
        "❌ Erreur dans getInfrastructuresByQuartier:",
        error.message,
      );
      return [];
    }
  }

  async getInfrastructuresByEtat() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("etat");

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        acc[item.etat] = (acc[item.etat] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([_id, count]) => ({ _id, count }));
    } catch (error) {
      console.error("❌ Erreur dans getInfrastructuresByEtat:", error.message);
      return [];
    }
  }

  async getInfrastructuresByDepartement() {
    try {
      // Récupérer les infrastructures avec leur localisation
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Récupérer le mapping communes → départements
      const { data: communes, error: communesError } = await supabase
        .from("communes")
        .select("id, nom, departement_id");

      if (communesError) throw communesError;

      // Récupérer les noms des départements
      const { data: departements, error: depError } = await supabase
        .from("departements")
        .select("id, nom");

      if (depError) throw depError;

      // Créer un mapping commune_nom → nom_département
      const communeToDept = {};
      communes.forEach((c) => {
        const deptName = departements.find(
          (d) => d.id === c.departement_id,
        )?.nom;
        if (c.nom && deptName) {
          communeToDept[c.nom.toUpperCase()] = deptName;
        }
      });

      // Agréger par département en utilisant le mapping
      const grouped = infrastructures.reduce((acc, item) => {
        const commune = item.localisation?.commune;
        const dept = commune
          ? communeToDept[commune.toUpperCase()] || "Non spécifié"
          : "Non spécifié";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getInfrastructuresByDepartement:",
        error.message,
      );
      return [];
    }
  }

  async getInfrastructuresByCommune() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        const commune = item.localisation?.commune || "Non spécifié";
        acc[commune] = (acc[commune] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getInfrastructuresByCommune:",
        error.message,
      );
      return [];
    }
  }

  async getInfrastructuresByArrondissement() {
    try {
      // Récupérer les infrastructures avec leur localisation
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Puisque les infrastructures ne stockent pas d'arrondissement spécifique,
      // on agrège simplement tout comme "Non spécifié"
      const grouped = {};

      infrastructures.forEach((item) => {
        // Tenter d'obtenir l'arrondissement si disponible
        const arrondissement =
          item.localisation?.arrondissement || "Non spécifié";
        grouped[arrondissement] = (grouped[arrondissement] || 0) + 1;
      });

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getInfrastructuresByArrondissement:",
        error.message,
      );
      return [];
    }
  }

  async getInfrastructuresByVillage() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        const village =
          item.localisation?.village ||
          item.localisation?.quartier ||
          "Non spécifié";
        acc[village] = (acc[village] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getInfrastructuresByVillage:",
        error.message,
      );
      return [];
    }
  }

  async getCommunesByDepartement(departement) {
    if (!departement) return [];
    try {
      // Récupérer les communes du département spécifié
      const { data: communes, error: communesError } = await supabase
        .from("communes")
        .select("id, nom, departement_id");

      if (communesError) throw communesError;

      // Récupérer les départements pour trouver l'ID
      const { data: departements, error: depError } = await supabase
        .from("departements")
        .select("id, nom")
        .eq("nom", departement);

      if (depError) throw depError;

      if (!departements || departements.length === 0) {
        return [];
      }

      const deptId = departements[0].id;
      const deptCommunes = communes
        .filter((c) => c.departement_id === deptId)
        .map((c) => c.nom.toUpperCase());

      if (deptCommunes.length === 0) {
        return [];
      }

      // Récupérer les infrastructures
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Agréger par commune pour ce département
      const grouped = infrastructures.reduce((acc, item) => {
        const commune = item.localisation?.commune;
        if (commune && deptCommunes.includes(commune.toUpperCase())) {
          acc[commune] = (acc[commune] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error("❌ Erreur dans getCommunesByDepartement:", error.message);
      return [];
    }
  }

  async getArrondissementsByCommune(commune) {
    if (!commune) return [];
    try {
      // Récupérer la commune pour avoir son ID
      const { data: communeData, error: communeError } = await supabase
        .from("communes")
        .select("id, nom")
        .eq("nom", commune);

      if (communeError) throw communeError;

      if (!communeData || communeData.length === 0) {
        return [];
      }

      const communeId = communeData[0].id;

      // Récupérer les arrondissements de cette commune
      const { data: arrondissements, error: arrError } = await supabase
        .from("arrondissements")
        .select("nom")
        .eq("commune_id", communeId);

      if (arrError) throw arrError;

      const arrNames = arrondissements.map((a) => a.nom.toUpperCase());

      if (arrNames.length === 0) {
        return [];
      }

      // Récupérer les infrastructures
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Compter les infrastructures par arrondissement
      // Note: Si la commune a des arrondissements connus, on les utilise
      const grouped = {};
      arrNames.forEach((arr) => {
        grouped[arr] = 0;
      });

      infrastructures.forEach((item) => {
        if (item.localisation?.commune === commune) {
          // Puisqu'on ne sait pas quel arrondissement exactement,
          // on distribue ou on marque comme non spécifié
          grouped["Non spécifié"] = (grouped["Non spécifié"] || 0) + 1;
        }
      });

      return Object.entries(grouped)
        .filter(([_id, count]) => count > 0 || _id !== "Non spécifié")
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getArrondissementsByCommune:",
        error.message,
      );
      return [];
    }
  }

  async getArrondissementsByDepartement(departement) {
    if (!departement) return [];
    try {
      // Récupérer l'ID du département
      const { data: depData, error: depError } = await supabase
        .from("departements")
        .select("id, nom")
        .eq("nom", departement);

      if (depError) throw depError;

      if (!depData || depData.length === 0) {
        return [];
      }

      const deptId = depData[0].id;

      // Récupérer les communes du département
      const { data: communes, error: communesError } = await supabase
        .from("communes")
        .select("id, nom")
        .eq("departement_id", deptId);

      if (communesError) throw communesError;

      if (!communes || communes.length === 0) {
        return [];
      }

      const communeIds = communes.map((c) => c.id);

      // Récupérer les arrondissements de ces communes
      const { data: arrondissements, error: arrError } = await supabase
        .from("arrondissements")
        .select("nom")
        .in("commune_id", communeIds);

      if (arrError) throw arrError;

      const arrNames = arrondissements.map((a) => a.nom.toUpperCase());

      if (arrNames.length === 0) {
        return [];
      }

      // Récupérer les infrastructures
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Créer un mapping commune_nom → commune_id pour rapide lookup
      const communeMap = {};
      communes.forEach((c) => {
        communeMap[c.nom.toUpperCase()] = c.id;
      });

      // Créer un mapping commune_id → [arrondissements]
      const communeToArrs = {};
      arrondissements.forEach((a) => {
        if (!communeToArrs[a.commune_id]) {
          communeToArrs[a.commune_id] = [];
        }
        communeToArrs[a.commune_id].push(a.nom);
      });

      // Compter par arrondissement
      const grouped = {};
      arrNames.forEach((arr) => {
        grouped[arr] = 0;
      });

      infrastructures.forEach((item) => {
        const commune = item.localisation?.commune;
        if (commune) {
          const commId = communeMap[commune.toUpperCase()];
          if (commId && communeToArrs[commId]) {
            // Marquer comme dans l'un des arrondissements de la commune
            grouped["Non spécifié"] = (grouped["Non spécifié"] || 0) + 1;
          }
        }
      });

      return Object.entries(grouped)
        .filter(([_id, count]) => count > 0)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getArrondissementsByDepartement:",
        error.message,
      );
      return [];
    }
  }

  async getVillagesByArrondissement(arrondissement) {
    if (!arrondissement) return [];
    try {
      // Récupérer l'arrondissement pour avoir sa commune_id
      const { data: arrData, error: arrError } = await supabase
        .from("arrondissements")
        .select("commune_id, nom")
        .eq("nom", arrondissement);

      if (arrError) throw arrError;

      if (!arrData || arrData.length === 0) {
        return [];
      }

      const communeId = arrData[0].commune_id;

      // Récupérer la commune pour avoir son nom
      const { data: commune, error: communeError } = await supabase
        .from("communes")
        .select("nom")
        .eq("id", communeId);

      if (communeError) throw communeError;

      if (!commune || commune.length === 0) {
        return [];
      }

      const communeName = commune[0].nom;

      // Récupérer les infrastructures de cette commune
      const { data: infrastructures, error: infraError } = await supabase
        .from("infrastructures")
        .select("localisation");

      if (infraError) throw infraError;

      // Agréger par quartier/village pour cette commune
      const grouped = infrastructures.reduce((acc, item) => {
        if (item.localisation?.commune === communeName) {
          const village =
            item.localisation?.village ||
            item.localisation?.quartier ||
            "Non spécifié";
          acc[village] = (acc[village] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error(
        "❌ Erreur dans getVillagesByArrondissement:",
        error.message,
      );
      return [];
    }
  }

  async getEvolution() {
    try {
      const sixMoisAgo = new Date();
      sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("infrastructures")
        .select("created_at")
        .gte("created_at", sixMoisAgo.toISOString());

      if (error) throw error;

      const grouped = data.reduce((acc, item) => {
        const date = new Date(item.created_at);
        const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([key, count]) => {
          const [month, year] = key.split("/");
          return {
            _id: { year: parseInt(year), month: parseInt(month) },
            count,
          };
        })
        .sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year;
          return a._id.month - b._id.month;
        });
    } catch (error) {
      console.error("❌ Erreur dans getEvolution:", error.message);
      return [];
    }
  }

  async getTopInfrastructures() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("nom, type, note_moyenne, nombre_avis")
        .order("note_moyenne", { ascending: false })
        .order("nombre_avis", { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map((item) => ({
        nom: item.nom,
        type: item.type,
        noteMoyenne: parseFloat(item.note_moyenne) || 0,
        nombreAvis: item.nombre_avis || 0,
      }));
    } catch (error) {
      console.error("❌ Erreur dans getTopInfrastructures:", error.message);
      return [];
    }
  }
}

module.exports = new StatisticsService();
