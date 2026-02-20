const supabase = require("../config/supabase");

// Cache pour stocker les enrichissements
const locationCache = {};

class StatisticsServiceFixed {
  /**
   * Enrichir une infrastructure avec les informations administratives
   */
  async enrichInfrastructure(infrastructure) {
    try {
      const coords = infrastructure.localisation?.coordinates;
      if (!coords || coords.length < 2) {
        return {
          ...infrastructure,
          departement: infrastructure.departement || "Non spécifié",
          arrondissement: infrastructure.arrondissement || "Non spécifié",
        };
      }

      const cacheKey = `${coords[0]}_${coords[1]}`;

      // Utiliser le cache si disponible
      if (locationCache[cacheKey]) {
        return {
          ...infrastructure,
          departement: locationCache[cacheKey].departement,
          arrondissement: locationCache[cacheKey].arrondissement,
        };
      }

      // Sinon, faire un appel à l'API administrative-location
      try {
        const response = await fetch(
          `http://localhost:5000/api/administrative-location?latitude=${coords[1]}&longitude=${coords[0]}`,
        );
        const result = await response.json();

        const adminData = {
          departement: result.data?.departement_nom || "Non spécifié",
          arrondissement: result.data?.arrondissement_nom || "Non spécifié",
        };

        locationCache[cacheKey] = adminData;

        return {
          ...infrastructure,
          ...adminData,
        };
      } catch (err) {
        console.error("Erreur enrichissement:", err.message);
        return {
          ...infrastructure,
          departement: "Littoral",
          arrondissement:
            infrastructure.localisation?.quartier || "Non spécifié",
        };
      }
    } catch (error) {
      console.error("Erreur enrichissement infrastructure:", error);
      return infrastructure;
    }
  }

  async getInfrastructuresByDepartement() {
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("*");

      if (error) throw error;

      // Enrichir les données
      const enriched = await Promise.all(
        data.map((infra) => this.enrichInfrastructure(infra)),
      );

      const grouped = enriched.reduce((acc, item) => {
        const departement = item.departement || "Non spécifié";
        acc[departement] = (acc[departement] || 0) + 1;
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

  async getCommunesByDepartement(departement) {
    if (!departement) return [];
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("*");

      if (error) throw error;

      // Enrichir et filtrer
      const enriched = await Promise.all(
        data.map((infra) => this.enrichInfrastructure(infra)),
      );

      const grouped = enriched.reduce((acc, item) => {
        if (item.departement !== departement) return acc;
        const commune = item.localisation?.commune || "Non spécifié";
        acc[commune] = (acc[commune] || 0) + 1;
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

  async getArrondissementsByDepartement(departement) {
    if (!departement) return [];
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("*");

      if (error) throw error;

      // Enrichir et filtrer
      const enriched = await Promise.all(
        data.map((infra) => this.enrichInfrastructure(infra)),
      );

      const grouped = enriched.reduce((acc, item) => {
        if (item.departement !== departement) return acc;
        const arrondissement =
          item.arrondissement || item.localisation?.quartier || "Non spécifié";
        acc[arrondissement] = (acc[arrondissement] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
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

  async getArrondissementsByCommune(commune) {
    if (!commune) return [];
    try {
      const { data, error } = await supabase
        .from("infrastructures")
        .select("*")
        .ilike("localisation->commune", commune);

      if (error) throw error;

      // Enrichir et filtrer
      const enriched = await Promise.all(
        data.map((infra) => this.enrichInfrastructure(infra)),
      );

      const grouped = enriched.reduce((acc, item) => {
        if (item.localisation?.commune?.toLowerCase() !== commune.toLowerCase())
          return acc;
        const arrondissement =
          item.arrondissement || item.localisation?.quartier || "Non spécifié";
        acc[arrondissement] = (acc[arrondissement] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped)
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
}

module.exports = new StatisticsServiceFixed();
