const express = require("express");
const statisticsService = require("../services/statisticsService");
const administrativeLocationService = require("../services/administrativeLocationService");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Obtenir les statistiques générales
router.get("/", auth, async (req, res) => {
  try {
    const [
      general,
      parType,
      parQuartier,
      parEtat,
      evolution,
      topInfrastructures,
      parDepartement,
      parCommune,
      parArrondissement,
      parVillage,
    ] = await Promise.all([
      statisticsService.getGeneralStats(),
      statisticsService.getInfrastructuresByType(),
      statisticsService.getInfrastructuresByQuartier(),
      statisticsService.getInfrastructuresByEtat(),
      statisticsService.getEvolution(),
      statisticsService.getTopInfrastructures(),
      statisticsService.getInfrastructuresByDepartement(),
      statisticsService.getInfrastructuresByCommune(),
      statisticsService.getInfrastructuresByArrondissement(),
      statisticsService.getInfrastructuresByVillage(),
    ]);

    res.json({
      general,
      parType,
      parQuartier,
      parEtat,
      evolution,
      topInfrastructures,
      parDepartement,
      parCommune,
      parArrondissement,
      parVillage,
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.get("/communes", auth, async (req, res) => {
  try {
    const { departement } = req.query;
    const data = await statisticsService.getCommunesByDepartement(departement);
    res.json({ data });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.get("/arrondissements", auth, async (req, res) => {
  try {
    const { commune, departement } = req.query;
    let data;

    if (departement) {
      data =
        await statisticsService.getArrondissementsByDepartement(departement);
    } else if (commune) {
      data = await statisticsService.getArrondissementsByCommune(commune);
    } else {
      data = await statisticsService.getInfrastructuresByArrondissement();
    }

    res.json({ data });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.get("/villages", auth, async (req, res) => {
  try {
    const { arrondissement } = req.query;
    const data =
      await statisticsService.getVillagesByArrondissement(arrondissement);
    res.json({ data });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ============================================
// ✨ STATISTIQUES ADMINISTRATIVES DES CONTRIBUTIONS
// ============================================

// Statistiques des contributions par arrondissement
router.get(
  "/contributions/arrondissements",
  auth,
  adminOnly,
  async (req, res) => {
    try {
      const data =
        await administrativeLocationService.getStatisticsByArrondissement();
      res.json({
        data,
        total: (data || []).reduce((sum, item) => sum + item.count, 0),
      });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

// Statistiques des contributions par commune
router.get("/contributions/communes", auth, adminOnly, async (req, res) => {
  try {
    const data = await administrativeLocationService.getStatisticsByCommune();
    res.json({
      data,
      total: (data || []).reduce((sum, item) => sum + item.count, 0),
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Statistiques des contributions par département
router.get("/contributions/departements", auth, adminOnly, async (req, res) => {
  try {
    const data =
      await administrativeLocationService.getStatisticsByDepartement();
    res.json({
      data,
      total: (data || []).reduce((sum, item) => sum + item.count, 0),
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
