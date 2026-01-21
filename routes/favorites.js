const express = require('express');
const infrastructureService = require('../services/infrastructureService');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/favorites
 * Récupérer les favoris
 */
router.get('/', auth, async (req, res) => {
  try {
    console.log('📥 [FAVORITES][GET]');
    console.log('  - User ID:', req.user?.id);
    console.log('  - Email:', req.user?.email);
    console.log('  - Role:', req.user?.role);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const isAdmin = [
      'super_admin',
      'admin',
      'agent_communal',
      'moderateur',
    ].includes(req.user.role);

    if (isAdmin) {
      console.log('👑 Mode admin → récupération de TOUS les favoris');
      const allFavorites = await infrastructureService.getAllFavorites();
      console.log(`✅ ${allFavorites.length} favori(s) récupéré(s)`);
      return res.status(200).json(allFavorites);
    }

    console.log('👤 Mode utilisateur → favoris personnels');
    const favorites = await infrastructureService.getFavoritesByUser(req.user.id);
    console.log(`✅ ${favorites.length} favori(s) récupéré(s)`);
    return res.status(200).json(favorites);

  } catch (error) {
    console.error('❌ [FAVORITES][GET] Error:', error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération des favoris',
      error: error.message,
    });
  }
});

/**
 * POST /api/favorites
 * Ajouter un favori
 */
router.post('/', auth, async (req, res) => {
  try {
    const { infrastructureId } = req.body;

    console.log('📥 [FAVORITES][POST]');
    console.log('  - User ID:', req.user?.id);
    console.log('  - Infrastructure ID:', infrastructureId);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!infrastructureId) {
      return res.status(400).json({
        message: "L'ID de l'infrastructure est requis",
      });
    }

    await infrastructureService.addFavorite(req.user.id, infrastructureId);

    console.log('✅ Favori ajouté');
    return res.status(201).json({
      success: true,
      message: 'Infrastructure ajoutée aux favoris',
    });

  } catch (error) {
    console.error('❌ [FAVORITES][POST] Error:', error);
    return res.status(500).json({
      message: "Erreur lors de l'ajout aux favoris",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/favorites/:id
 * Supprimer un favori
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('📥 [FAVORITES][DELETE]');
    console.log('  - User ID:', req.user?.id);
    console.log('  - Favorite ID:', req.params.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    await infrastructureService.removeFavorite(req.user.id, req.params.id);

    console.log('✅ Favori supprimé');
    return res.status(200).json({
      success: true,
      message: 'Infrastructure retirée des favoris',
    });

  } catch (error) {
    console.error('❌ [FAVORITES][DELETE] Error:', error);
    return res.status(500).json({
      message: 'Erreur lors de la suppression du favori',
      error: error.message,
    });
  }
});

module.exports = router;
