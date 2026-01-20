const express = require('express');
const statisticsService = require('../services/statisticsService');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Obtenir les statistiques générales
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [
      general,
      parType,
      parQuartier,
      parEtat,
      evolution,
      topInfrastructures
    ] = await Promise.all([
      statisticsService.getGeneralStats(),
      statisticsService.getInfrastructuresByType(),
      statisticsService.getInfrastructuresByQuartier(),
      statisticsService.getInfrastructuresByEtat(),
      statisticsService.getEvolution(),
      statisticsService.getTopInfrastructures()
    ]);

    res.json({
      general,
      parType,
      parQuartier,
      parEtat,
      evolution,
      topInfrastructures
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

