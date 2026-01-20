const express = require('express');
const infrastructureService = require('../services/infrastructureService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Obtenir les favoris de l'utilisateur ou tous les favoris pour les admins
router.get('/', auth, async (req, res) => {
  try {
    console.log('📥 Requête GET /api/favorites:');
    console.log('  - Utilisateur ID:', req.user.id);
    console.log('  - Utilisateur email:', req.user.email);
    console.log('  - Rôle:', req.user.role);
    
    // Si l'utilisateur est super_admin, admin, agent_communal ou modérateur, retourner tous les favoris
    // Sinon, retourner seulement les favoris de l'utilisateur
    if (
      req.user.role === 'super_admin' ||
      req.user.role === 'admin' ||
      req.user.role === 'agent_communal' ||
      req.user.role === 'moderateur'
    ) {
      console.log('👑 Mode admin: récupération de tous les favoris');
      const allFavorites = await infrastructureService.getAllFavorites();
      console.log(`✅ ${allFavorites.length} favori(s) récupéré(s) pour l'admin`);
      res.json(allFavorites);
    } else {
      console.log('👤 Mode utilisateur: récupération des favoris personnels');
      const favorites = await infrastructureService.getFavoritesByUser(req.user.id);
      console.log(`✅ ${favorites.length} favori(s) récupéré(s) pour l'utilisateur`);
      res.json(favorites);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des favoris:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des favoris.', error: error.message });
  }
});

// Ajouter un favori
router.post('/', auth, async (req, res) => {
  try {
    const { infrastructureId } = req.body;
    
    console.log('📥 Requête d\'ajout de favori reçue:');
    console.log('  - Utilisateur ID:', req.user.id);
    console.log('  - Utilisateur email:', req.user.email);
    console.log('  - Infrastructure ID:', infrastructureId);
    
    if (!infrastructureId) {
      return res.status(400).json({ message: 'ID d\'infrastructure requis.' });
    }

    await infrastructureService.addFavorite(req.user.id, infrastructureId);
    console.log('✅ Favori ajouté avec succès pour l\'utilisateur', req.user.id);
    res.json({ message: 'Infrastructure ajoutée aux favoris.' });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout aux favoris:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout aux favoris.', error: error.message });
  }
});

// Retirer un favori
router.delete('/:id', auth, async (req, res) => {
  try {
    await infrastructureService.removeFavorite(req.user.id, req.params.id);
    res.json({ message: 'Infrastructure retirée des favoris.' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du favori.' });
  }
});

module.exports = router;

