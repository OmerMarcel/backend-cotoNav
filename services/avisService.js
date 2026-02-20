const supabase = require("../config/supabase");
const infrastructureService = require("./infrastructureService");

class AvisService {
  async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("avis")
        .select(
          "*, infrastructure:infrastructures(*), utilisateur:users!utilisateur_id(id, nom, prenom, email, avatar)",
          { count: "exact" },
        );

      if (filters.infrastructure_id) {
        query = query.eq("infrastructure_id", filters.infrastructure_id);
      }
      if (filters.utilisateur_id) {
        query = query.eq("utilisateur_id", filters.utilisateur_id);
      }
      if (filters.approuve !== undefined) {
        query = query.eq("approuve", filters.approuve);
      }

      if (pagination.page && pagination.limit) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Transformer les données pour Flutter
      const transformedData = (data || []).map((avis) =>
        this.transformToFlutterFormat(avis),
      );

      return { data: transformedData, count: count || 0 };
    } catch (error) {
      console.error("❌ Erreur dans avisService.findAll:", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const { data, error } = await supabase
        .from("avis")
        .select(
          "*, infrastructure:infrastructures(*), utilisateur:users!utilisateur_id(id, nom, prenom, email, avatar)",
        )
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error("❌ Erreur dans avisService.findById:", error);
      throw error;
    }
  }

  async create(avisData) {
    try {
      // Vérifier que l'utilisateur n'a pas déjà laissé un avis pour cette infrastructure
      const existing = await supabase
        .from("avis")
        .select("id")
        .eq("infrastructure_id", avisData.infrastructure_id)
        .eq("utilisateur_id", avisData.utilisateur_id)
        .single();

      if (existing.data) {
        // Mettre à jour l'avis existant au lieu d'en créer un nouveau
        return this.update(existing.data.id, {
          note: avisData.note,
          commentaire: avisData.commentaire,
          photos: avisData.photos || [],
        });
      }

      const { data, error } = await supabase
        .from("avis")
        .insert({
          infrastructure_id: avisData.infrastructure_id,
          utilisateur_id: avisData.utilisateur_id,
          note: avisData.note,
          commentaire: avisData.commentaire || null,
          photos: avisData.photos || [],
          approuve: avisData.approuve !== undefined ? avisData.approuve : true,
        })
        .select(
          "*, infrastructure:infrastructures(*), utilisateur:users!utilisateur_id(id, nom, prenom, email, avatar)",
        )
        .single();

      if (error) {
        throw error;
      }

      // Mettre à jour la note moyenne de l'infrastructure (via le trigger SQL)
      // Le trigger SQL met à jour automatiquement note_moyenne et nombre_avis

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error("❌ Erreur dans avisService.create:", error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from("avis")
        .update(updates)
        .eq("id", id)
        .select(
          "*, infrastructure:infrastructures(*), utilisateur:users!utilisateur_id(id, nom, prenom, email, avatar)",
        )
        .single();

      if (error) {
        throw error;
      }

      // Le trigger SQL met à jour automatiquement la note moyenne

      return this.transformToFlutterFormat(data);
    } catch (error) {
      console.error("❌ Erreur dans avisService.update:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase.from("avis").delete().eq("id", id);

      if (error) {
        throw error;
      }

      // Le trigger SQL met à jour automatiquement la note moyenne

      return true;
    } catch (error) {
      console.error("❌ Erreur dans avisService.delete:", error);
      throw error;
    }
  }

  // Transformer les données Supabase au format attendu par Flutter
  transformToFlutterFormat(avis) {
    if (!avis) return null;

    const utilisateur = avis.utilisateur || {};
    const photos = avis.photos || [];

    return {
      id: avis.id,
      infrastructureId: avis.infrastructure_id,
      userId: avis.utilisateur_id,
      note: avis.note,
      commentaire: avis.commentaire || "",
      photos: photos,
      approuve: avis.approuve !== false,
      createdAt: avis.created_at || new Date().toISOString(),
      // Informations utilisateur
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom || "",
        prenom: utilisateur.prenom || "",
        email: utilisateur.email || "",
        avatar: utilisateur.avatar,
      },
      // Garder aussi les champs originaux pour compatibilité
      ...avis,
    };
  }
}

module.exports = new AvisService();
