const supabase = require("../config/supabase");

/**
 * Enrichir les statistiques avec les données administratives
 */
class StatisticsEnricher {
  constructor() {
    this.cache = {};
  }

  /**
   * De Cotonou → Littoral
   * De Ouidah → Atlantique
   * etc.
   */
  async getCommuneToDepartement(commune) {
    if (this.cache[commune]) {
      return this.cache[commune];
    }

    try {
      const { data } = await supabase
        .from("communes")
        .select("departement_id, nom")
        .ilike("nom", commune)
        .limit(1);

      if (data && data.length > 0) {
        const deptId = data[0].departement_id;

        // Trouver le département
        const { data: dept } = await supabase
          .from("departements")
          .select("nom")
          .eq("id", deptId)
          .limit(1);

        if (dept && dept.length > 0) {
          this.cache[commune] = dept[0].nom;
          return dept[0].nom;
        }
      }
    } catch (error) {
      console.error(`Erreur mapping commune ${commune}:`, error.message);
    }

    return "Non spécifié";
  }

  /**
   * Récupérer les arrondissements d'une commune
   */
  async getArrondisementsByCommune(commune) {
    try {
      const { data } = await supabase
        .from("communes")
        .select("id, nom")
        .ilike("nom", commune)
        .limit(1);

      if (!data || data.length === 0) return [];

      const communeId = data[0].id;

      const { data: arrondissements } = await supabase
        .from("arrondissements")
        .select("nom")
        .eq("commune_id", communeId);

      return arrondissements?.map((a) => a.nom) || [];
    } catch (error) {
      console.error(`Erreur arrondissements ${commune}:`, error.message);
      return [];
    }
  }

  /**
   * Enrichir un tableau  d'agrégations statistiques
   */
  async enrichStatistics(dataWithContributions, field) {
    const enrichedData = [];

    for (const item of dataWithContributions) {
      if (field === "departement") {
        const dept = await this.getCommuneToDepartement(item._id);
        enrichedData.push({ ...item, _id: dept || item._id });
      }
      // Ajouter d'autres transformations selon le besoin
      else {
        enrichedData.push(item);
      }
    }

    // Agréger les doublons après enrichissement
    const aggregated = enrichedData.reduce((acc, item) => {
      const existing = acc.find((x) => x._id === item._id);
      if (existing) {
        existing.count += item.count;
      } else {
        acc.push(item);
      }
      return acc;
    }, []);

    return aggregated.sort((a, b) => b.count - a.count);
  }
}

module.exports = new StatisticsEnricher();
