const supabase = require("../config/supabase");

class AdministrativeLocationService {
  /**
   * Définit la localisation administrative d'une contribution
   * Basé sur latitude/longitude, détermine l'arrondissement, commune, département, préfecture
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>} Localisation administrative
   */
  async getAdministrativeLocation(latitude, longitude) {
    try {
      if (!latitude || !longitude) {
        throw new Error("Latitude et longitude sont requises");
      }

      // Utiliser la fonction PostgreSQL
      const { data, error } = await supabase.rpc(
        "get_administrative_location",
        {
          p_latitude: latitude,
          p_longitude: longitude,
        },
      );

      if (error) {
        console.error("Erreur RPC get_administrative_location:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Si RPC échoue, utiliser la recherche directe
        return await this.findNearestAdministrativeLocation(
          latitude,
          longitude,
        );
      }

      return {
        arrondissement_id: data[0].arrondissement_id,
        arrondissement_nom: data[0].arrondissement_nom,
        commune_id: data[0].commune_id,
        commune_nom: data[0].commune_nom,
        departement_id: data[0].departement_id,
        departement_nom: data[0].departement_nom,
        prefecture_id: data[0].prefecture_id,
        prefecture_nom: data[0].prefecture_nom,
        distance_arrondissement: data[0].distance_arrondissement,
        distance_mairie: data[0].distance_mairie,
        found: true,
      };
    } catch (error) {
      console.error("Erreur getAdministrativeLocation:", error);
      // Fallback sur la recherche directe
      return await this.findNearestAdministrativeLocation(latitude, longitude);
    }
  }

  /**
   * Recherche directe (fallback si RPC échoue)
   */
  async findNearestAdministrativeLocation(latitude, longitude) {
    try {
      // Chercher l'arrondissement le plus proche
      const { data: arrondissements, error: arrError } = await supabase
        .from("arrondissements")
        .select(
          `
          id,
          nom,
          latitude,
          longitude,
          commune_id,
          communes (
            id,
            nom,
            departement_id,
            departements (
              id,
              nom
            )
          )
        `,
        )
        .gte("latitude", latitude - 1)
        .lte("latitude", latitude + 1)
        .gte("longitude", longitude - 1)
        .lte("longitude", longitude + 1);

      if (arrError) throw arrError;

      let nearestArr = null;
      let minDistance = Infinity;

      // Calculer la distance de Haversine
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // en mètres
      };

      if (arrondissements && arrondissements.length > 0) {
        for (const arr of arrondissements) {
          const distance = calculateDistance(
            latitude,
            longitude,
            arr.latitude,
            arr.longitude,
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestArr = arr;
          }
        }
      }

      if (!nearestArr) {
        // Si aucun arrondissement trouvé dans la zone, chercher le plus proche globalement
        const { data: allArr } = await supabase
          .from("arrondissements")
          .select(
            `
            id,
            nom,
            latitude,
            longitude,
            commune_id,
            communes (
              id,
              nom,
              departement_id,
              departements (
                id,
                nom
              )
            )
          `,
          )
          .limit(100);

        if (allArr && allArr.length > 0) {
          minDistance = Infinity;
          for (const arr of allArr) {
            const distance = calculateDistance(
              latitude,
              longitude,
              arr.latitude,
              arr.longitude,
            );

            if (distance < minDistance) {
              minDistance = distance;
              nearestArr = arr;
            }
          }
        }
      }

      // Chercher la mairie la plus proche
      const { data: mairies } = await supabase
        .from("mairies")
        .select("id, nom, latitude, longitude")
        .gte("latitude", latitude - 0.5)
        .lte("latitude", latitude + 0.5)
        .gte("longitude", longitude - 0.5)
        .lte("longitude", longitude + 0.5)
        .limit(50);

      let minMairieDistance = Infinity;
      const calculateDistance2 = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
      };

      if (mairies && mairies.length > 0) {
        for (const mairie of mairies) {
          const distance = calculateDistance2(
            latitude,
            longitude,
            mairie.latitude,
            mairie.longitude,
          );
          minMairieDistance = Math.min(minMairieDistance, distance);
        }
      }

      if (minMairieDistance === Infinity) {
        minMairieDistance = null;
      }

      if (nearestArr) {
        // Chercher la préfecture du département
        const { data: prefecture } = await supabase
          .from("prefectures")
          .select("id, nom")
          .eq("departement_id", nearestArr.communes.departement_id)
          .single();

        return {
          arrondissement_id: nearestArr.id,
          arrondissement_nom: nearestArr.nom,
          commune_id: nearestArr.communes.id,
          commune_nom: nearestArr.communes.nom,
          departement_id: nearestArr.communes.departement_id,
          departement_nom: nearestArr.communes.departements.nom,
          prefecture_id: prefecture?.id || null,
          prefecture_nom: prefecture?.nom || null,
          distance_arrondissement: minDistance,
          distance_mairie: minMairieDistance,
          found: true,
        };
      }

      return {
        found: false,
        error: "Impossible de déterminer la localisation administrative",
      };
    } catch (error) {
      console.error("Erreur findNearestAdministrativeLocation:", error);
      return {
        found: false,
        error: error.message,
      };
    }
  }

  /**
   * Enregistre la localisation administrative d'une contribution
   */
  async recordContributionLocation(contribution_id, latitude, longitude) {
    try {
      const location = await this.getAdministrativeLocation(
        latitude,
        longitude,
      );

      if (!location.found) {
        throw new Error(location.error);
      }

      const { data, error } = await supabase
        .from("contributions_localisation_admin")
        .insert([
          {
            contribution_id,
            arrondissement_id: location.arrondissement_id,
            commune_id: location.commune_id,
            departement_id: location.departement_id,
            prefecture_id: location.prefecture_id,
            latitude,
            longitude,
            distance_arrondissement: location.distance_arrondissement,
          },
        ])
        .select();

      if (error) throw error;

      return {
        success: true,
        location,
        record: data[0],
      };
    } catch (error) {
      console.error("Erreur recordContributionLocation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtient les statistiques par arrondissement
   */
  async getStatisticsByArrondissement() {
    try {
      const { data, error } = await supabase
        .from("contributions_localisation_admin")
        .select(
          `
          arrondissement_id,
          arrondissements (
            id,
            nom,
            communes (
              nom,
              departements (
                nom
              )
            )
          )
        `,
        )
        .not("arrondissement_id", "is", null);

      if (error) throw error;

      // Grouper par arrondissement
      const stats = {};
      if (data) {
        for (const record of data) {
          const arrId = record.arrondissement_id;
          if (!stats[arrId]) {
            stats[arrId] = {
              arrondissement_id: arrId,
              arrondissement_nom: record.arrondissements?.nom,
              commune_nom: record.arrondissements?.communes?.nom,
              departement_nom:
                record.arrondissements?.communes?.departements?.nom,
              count: 0,
            };
          }
          stats[arrId].count++;
        }
      }

      return Object.values(stats);
    } catch (error) {
      console.error("Erreur getStatisticsByArrondissement:", error);
      return [];
    }
  }

  /**
   * Obtient les statistiques par commune
   */
  async getStatisticsByCommune() {
    try {
      const { data, error } = await supabase
        .from("contributions_localisation_admin")
        .select(
          `
          commune_id,
          communes (
            id,
            nom,
            departements (
              nom
            )
          )
        `,
        )
        .not("commune_id", "is", null);

      if (error) throw error;

      const stats = {};
      if (data) {
        for (const record of data) {
          const commId = record.commune_id;
          if (!stats[commId]) {
            stats[commId] = {
              commune_id: commId,
              commune_nom: record.communes?.nom,
              departement_nom: record.communes?.departements?.nom,
              count: 0,
            };
          }
          stats[commId].count++;
        }
      }

      return Object.values(stats);
    } catch (error) {
      console.error("Erreur getStatisticsByCommune:", error);
      return [];
    }
  }

  /**
   * Obtient les statistiques par département
   */
  async getStatisticsByDepartement() {
    try {
      const { data, error } = await supabase
        .from("contributions_localisation_admin")
        .select(
          `
          departement_id,
          departements (
            id,
            nom
          )
        `,
        )
        .not("departement_id", "is", null);

      if (error) throw error;

      const stats = {};
      if (data) {
        for (const record of data) {
          const deptId = record.departement_id;
          if (!stats[deptId]) {
            stats[deptId] = {
              departement_id: deptId,
              departement_nom: record.departements?.nom,
              count: 0,
            };
          }
          stats[deptId].count++;
        }
      }

      return Object.values(stats);
    } catch (error) {
      console.error("Erreur getStatisticsByDepartement:", error);
      return [];
    }
  }
}

module.exports = new AdministrativeLocationService();
