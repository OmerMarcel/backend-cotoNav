const express = require("express");
const rewardService = require("../services/rewardService");
const { auth, requireStaff } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/rewards/user/:userId
 * Obtenir les informations de récompense d'un utilisateur
 * Authentification requise
 */
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;

    // Un utilisateur ne peut voir que ses propres récompenses
    // ou un admin peut voir celles de n'importe qui
    if (
      requestedUserId !== authenticatedUserId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à accéder à ces informations.",
      });
    }

    const rewards = await rewardService.getUserRewards(requestedUserId);

    res.json({
      status: "success",
      data: rewards,
    });
  } catch (error) {
    console.error("❌ Erreur récupération récompenses:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des récompenses.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/history/:userId
 * Obtenir l'historique des contributions d'un utilisateur
 * Authentification requise
 */
router.get("/history/:userId", auth, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Vérification des permissions
    if (
      requestedUserId !== authenticatedUserId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à accéder à ces informations.",
      });
    }

    const history = await rewardService.getUserContributionHistory({
      userId: requestedUserId,
      page,
      limit,
    });

    res.json({
      status: "success",
      data: history.data,
      pagination: history.pagination,
    });
  } catch (error) {
    console.error("❌ Erreur récupération historique:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de l'historique.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/leaderboard
 * Obtenir le classement des utilisateurs
 * Accès public
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const zoneId = req.query.zone_id || null; // Filtrage par zone optionnel

    const leaderboard = await rewardService.getLeaderboard({
      limit,
      zoneId,
    });

    res.json({
      status: "success",
      data: leaderboard,
    });
  } catch (error) {
    console.error("❌ Erreur récupération classement:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du classement.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/levels
 * Obtenir tous les niveaux disponibles
 * Accès public
 */
router.get("/levels", async (req, res) => {
  try {
    const levels = await rewardService.getAllLevels();

    res.json({
      status: "success",
      data: levels,
    });
  } catch (error) {
    console.error("❌ Erreur récupération niveaux:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des niveaux.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/badges
 * Obtenir tous les badges disponibles
 * Accès public
 */
router.get("/badges", async (req, res) => {
  try {
    const badges = await rewardService.getAllBadges();

    res.json({
      status: "success",
      data: badges,
    });
  } catch (error) {
    console.error("❌ Erreur récupération badges:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des badges.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/stats
 * Obtenir les statistiques globales du système de récompense
 * Réservé aux administrateurs
 */
router.get("/stats", auth, requireStaff, async (req, res) => {
  try {
    const stats = await rewardService.getGlobalStats();

    res.json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    console.error("❌ Erreur récupération statistiques:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
      error: error.message,
    });
  }
});

/**
 * POST /api/rewards/contribute
 * Enregistrer manuellement une contribution (pour actions spéciales)
 * Réservé aux administrateurs
 */
router.post("/contribute", auth, requireStaff, async (req, res) => {
  try {
    const { userId, contributionType, relatedEntityId, details } = req.body;

    if (!userId || !contributionType) {
      return res.status(400).json({
        message: "userId et contributionType sont requis.",
      });
    }

    // Vérifier que le type de contribution est valide
    const validTypes = [
      "avis",
      "photo",
      "video",
      "vote_utile",
      "reponse",
      "proposition",
      "signalement",
      "avis_detaille",
    ];

    if (!validTypes.includes(contributionType)) {
      return res.status(400).json({
        message: `Type de contribution invalide. Types valides: ${validTypes.join(", ")}`,
      });
    }

    const result = await rewardService.recordContribution({
      userId,
      contributionType,
      relatedEntityId,
      details: details || {},
    });

    res.json({
      status: "success",
      message: "Contribution enregistrée avec succès.",
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur enregistrement contribution:", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement de la contribution.",
      error: error.message,
    });
  }
});

/**
 * POST /api/rewards/award-manual
 * Attribuer manuellement des points à un utilisateur
 * Réservé aux super administrateurs
 */
router.post("/award-manual", auth, async (req, res) => {
  try {
    // Seul les super_admin peuvent attribuer des points manuellement
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Action réservée aux super administrateurs.",
      });
    }

    const { userId, points, reason } = req.body;

    if (!userId || !points) {
      return res.status(400).json({
        message: "userId et points sont requis.",
      });
    }

    if (typeof points !== "number" || points <= 0) {
      return res.status(400).json({
        message: "Les points doivent être un nombre positif.",
      });
    }

    // Créer un type de contribution spécial pour les points manuels
    const result = await rewardService.recordContribution({
      userId,
      contributionType: "reponse", // Utiliser un type existant
      relatedEntityId: null,
      details: {
        manual_award: true,
        admin_id: req.user.id,
        reason: reason || "Attribution manuelle de points",
        custom_points: points,
      },
    });

    res.json({
      status: "success",
      message: `${points} points attribués avec succès.`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur attribution manuelle:", error);
    res.status(500).json({
      message: "Erreur lors de l'attribution des points.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/my-rewards
 * Raccourci pour obtenir ses propres récompenses
 * Authentification requise
 */
router.get("/my-rewards", auth, async (req, res) => {
  try {
    const rewards = await rewardService.getUserRewards(req.user.id);

    res.json({
      status: "success",
      data: rewards,
    });
  } catch (error) {
    console.error("❌ Erreur récupération récompenses:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de vos récompenses.",
      error: error.message,
    });
  }
});

/**
 * GET /api/rewards/my-history
 * Raccourci pour obtenir son propre historique
 * Authentification requise
 */
router.get("/my-history", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const history = await rewardService.getUserContributionHistory({
      userId: req.user.id,
      page,
      limit,
    });

    res.json({
      status: "success",
      data: history.data,
      pagination: history.pagination,
    });
  } catch (error) {
    console.error("❌ Erreur récupération historique:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de votre historique.",
      error: error.message,
    });
  }
});

module.exports = router;
