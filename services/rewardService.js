const supabase = require("../config/supabase");

/**
 * Service de gestion du système de récompense
 * Gère les points, niveaux et badges des utilisateurs
 */
class RewardService {
  /**
   * Enregistrer une contribution et attribuer des points
   * @param {Object} params - Paramètres de la contribution
   * @param {string} params.userId - ID de l'utilisateur
   * @param {string} params.contributionType - Type de contribution (avis, photo, video, etc.)
   * @param {string} params.relatedEntityId - ID de l'entité liée (optionnel)
   * @param {Object} params.details - Détails supplémentaires (optionnel)
   * @returns {Promise<Object>} Résultat avec points, niveau et badges
   */
  async recordContribution({
    userId,
    contributionType,
    relatedEntityId = null,
    details = {},
  }) {
    try {
      // Appeler la fonction PostgreSQL pour enregistrer la contribution
      const { data, error } = await supabase.rpc("record_contribution", {
        p_user_id: userId,
        p_contribution_type: contributionType,
        p_related_entity_id: relatedEntityId,
        p_details: details,
      });

      if (error) {
        console.error(
          "❌ Erreur lors de l'enregistrement de la contribution:",
          error,
        );
        throw error;
      }

      return {
        success: true,
        contribution_id: data.contribution_id,
        points_awarded: data.points_awarded,
        total_points: data.total_points,
        level_changed: data.level_changed,
        new_level: data.new_level,
        badges_unlocked: data.badges_unlocked,
      };
    } catch (error) {
      console.error("❌ Erreur dans recordContribution:", error);
      throw error;
    }
  }

  /**
   * Obtenir les informations de récompense d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Informations de récompense
   */
  async getUserRewards(userId) {
    try {
      // Récupérer les informations de l'utilisateur
      const { data: user, error: userError } = await supabase
        .from("users")
        .select(
          "id, nom, prenom, email, avatar, total_points, current_level, badges_json, created_at",
        )
        .eq("id", userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Récupérer les détails du niveau actuel
      const { data: currentLevel, error: levelError } = await supabase
        .from("levels")
        .select(
          "level_id, level_name, points_required, description, badge_icon",
        )
        .eq("level_id", user.current_level)
        .single();

      if (levelError && levelError.code !== "PGRST116") {
        throw levelError;
      }

      // Récupérer le prochain niveau
      const { data: nextLevel, error: nextLevelError } = await supabase
        .from("levels")
        .select("level_id, level_name, points_required, description")
        .gt("points_required", user.total_points)
        .order("points_required", { ascending: true })
        .limit(1)
        .single();

      // Calculer les points jusqu'au prochain niveau
      let pointsToNextLevel = null;
      let progressPercentage = 100;

      if (nextLevel && currentLevel) {
        pointsToNextLevel = nextLevel.points_required - user.total_points;
        const levelPointsRange =
          nextLevel.points_required - currentLevel.points_required;
        const userProgressInLevel =
          user.total_points - currentLevel.points_required;
        progressPercentage =
          levelPointsRange > 0
            ? Math.round((userProgressInLevel / levelPointsRange) * 100)
            : 100;
      }

      // Récupérer les détails des badges obtenus
      let userBadges = [];
      if (user.badges_json && Object.keys(user.badges_json).length > 0) {
        const badgeCodes = Object.keys(user.badges_json);
        const { data: badgesDetails, error: badgesError } = await supabase
          .from("badges")
          .select("badge_code, badge_name, description, badge_icon")
          .in("badge_code", badgeCodes);

        if (!badgesError && badgesDetails) {
          userBadges = badgesDetails.map((badge) => ({
            ...badge,
            earned_at: user.badges_json[badge.badge_code],
          }));
        }
      }

      // Récupérer la position dans le classement
      const { data: leaderboardData } = await supabase
        .from("user_leaderboard")
        .select("rank")
        .eq("id", userId)
        .single();

      return {
        user_id: user.id,
        user_name: `${user.prenom} ${user.nom}`,
        avatar: user.avatar,
        total_points: user.total_points,
        current_level: {
          level_id: currentLevel?.level_id || 1,
          level_name: currentLevel?.level_name || "Novice",
          points_required: currentLevel?.points_required || 0,
          description: currentLevel?.description,
          badge_icon: currentLevel?.badge_icon,
          points_to_next_level: pointsToNextLevel,
          progress_percentage: progressPercentage,
        },
        next_level: nextLevel
          ? {
              level_id: nextLevel.level_id,
              level_name: nextLevel.level_name,
              points_required: nextLevel.points_required,
            }
          : null,
        badges: userBadges,
        rank: leaderboardData?.rank || null,
        member_since: user.created_at,
      };
    } catch (error) {
      console.error("❌ Erreur dans getUserRewards:", error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des contributions d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} pagination - Pagination { page, limit }
   * @returns {Promise<Object>} Historique des contributions
   */
  async getUserContributions(userId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("reward_contributions")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("contribution_date", { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error("❌ Erreur dans getUserContributions:", error);
      throw error;
    }
  }

  /**
   * Obtenir le classement général (leaderboard)
   * @param {Object} options - Options { limit, offset }
   * @returns {Promise<Array>} Liste des utilisateurs classés
   */
  async getLeaderboard(options = { limit: 50, offset: 0 }) {
    try {
      const { limit, offset } = options;

      const { data, error } = await supabase
        .from("user_leaderboard")
        .select("*")
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Erreur dans getLeaderboard:", error);
      throw error;
    }
  }

  /**
   * Obtenir tous les niveaux disponibles
   * @returns {Promise<Array>} Liste des niveaux
   */
  async getAllLevels() {
    try {
      const { data, error } = await supabase
        .from("levels")
        .select("*")
        .order("level_id", { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Erreur dans getAllLevels:", error);
      throw error;
    }
  }

  /**
   * Obtenir tous les badges disponibles
   * @returns {Promise<Array>} Liste des badges
   */
  async getAllBadges() {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("is_active", true)
        .order("badge_code", { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Erreur dans getAllBadges:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de contribution d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Statistiques de contribution
   */
  async getUserContributionStats(userId) {
    try {
      const { data, error } = await supabase
        .from("user_contribution_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Si aucune statistique n'existe, retourner des valeurs par défaut
      if (!data) {
        return {
          user_id: userId,
          total_contributions: 0,
          total_points_earned: 0,
          contribution_types_count: 0,
          active_days: 0,
          last_contribution_date: null,
          contributions_by_type: {},
        };
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur dans getUserContributionStats:", error);
      throw error;
    }
  }

  /**
   * Vérifier et attribuer manuellement des badges
   * (Utile pour des badges spéciaux ou des corrections)
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Nouveaux badges attribués
   */
  async checkAndAwardBadges(userId) {
    try {
      const { data, error } = await supabase.rpc("check_and_award_badges", {
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Erreur dans checkAndAwardBadges:", error);
      throw error;
    }
  }

  /**
   * Enregistrer un vote utile sur un avis
   * @param {string} userId - ID de l'utilisateur qui vote
   * @param {string} avisId - ID de l'avis
   * @returns {Promise<Object>} Résultat
   */
  async recordHelpfulVote(userId, avisId) {
    try {
      // Enregistrer la contribution
      const result = await this.recordContribution({
        userId,
        contributionType: "vote_utile",
        relatedEntityId: avisId,
        details: { avis_id: avisId },
      });

      return result;
    } catch (error) {
      console.error("❌ Erreur dans recordHelpfulVote:", error);
      throw error;
    }
  }

  /**
   * Calculer les points pour une contribution (sans l'enregistrer)
   * Utile pour prévisualiser les points avant validation
   * @param {string} contributionType - Type de contribution
   * @param {Object} details - Détails
   * @returns {number} Points calculés
   */
  calculatePoints(contributionType, details = {}) {
    let points = 0;

    switch (contributionType) {
      case "avis":
        points = 10;
        if (details.character_count && details.character_count > 200) {
          points += 10;
        }
        break;
      case "photo":
        points = 5;
        if (details.quality === "high") {
          points += 3;
        }
        break;
      case "video":
        points = 15;
        break;
      case "vote_utile":
        points = 1;
        break;
      case "reponse":
        points = 3;
        break;
      case "proposition":
        points = 20;
        break;
      case "signalement":
        points = 8;
        break;
      default:
        points = 0;
    }

    return points;
  }
}

module.exports = new RewardService();
