const express = require('express');
const avisService = require('../services/avisService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Obtenir tous les avis d'une infrastructure (accès public pour la lecture)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const filters = {};
    if (req.query.infrastructure_id) {
      filters.infrastructure_id = req.query.infrastructure_id;
    }
    if (req.query.utilisateur_id) {
      filters.utilisateur_id = req.query.utilisateur_id;
    }
    // Par défaut, ne retourner que les avis approuvés
    if (req.query.approuve !== undefined) {
      filters.approuve = req.query.approuve === 'true';
    } else {
      filters.approuve = true;
    }

    const { data: avis, count } = await avisService.findAll(
      filters,
      { page, limit }
    );

    res.json({
      data: avis,
      avis, // Alias pour compatibilité
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir un avis par ID
router.get('/:id', async (req, res) => {
  try {
    const avis = await avisService.findById(req.params.id);
    if (!avis) {
      return res.status(404).json({ message: 'Avis non trouvé.' });
    }
    res.json({ data: avis });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Créer un nouvel avis (authentification requise)
router.post('/', auth, async (req, res) => {
  try {
    const { infrastructureId, note, commentaire, photos } = req.body;

    if (!infrastructureId || !note) {
      return res.status(400).json({ message: 'infrastructureId et note sont requis.' });
    }

    if (note < 1 || note > 5) {
      return res.status(400).json({ message: 'La note doit être entre 1 et 5.' });
    }

    const avis = await avisService.create({
      infrastructure_id: infrastructureId,
      utilisateur_id: req.user.id,
      note: parseInt(note),
      commentaire: commentaire || null,
      photos: photos || [],
      approuve: true, // Par défaut approuvé (peut être modéré plus tard)
    });

    res.status(201).json({ 
      data: avis,
      message: 'Avis publié avec succès.' 
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'avis:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de l\'avis.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour un avis (seulement le propriétaire)
router.patch('/:id', auth, async (req, res) => {
  try {
    const avis = await avisService.findById(req.params.id);
    if (!avis) {
      return res.status(404).json({ message: 'Avis non trouvé.' });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'avis
    if (avis.utilisateur_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres avis.' });
    }

    const updatedAvis = await avisService.update(req.params.id, {
      note: req.body.note ? parseInt(req.body.note) : undefined,
      commentaire: req.body.commentaire,
      photos: req.body.photos,
    });

    res.json({ data: updatedAvis });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Supprimer un avis (seulement le propriétaire ou admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const avis = await avisService.findById(req.params.id);
    if (!avis) {
      return res.status(404).json({ message: 'Avis non trouvé.' });
    }

    // Vérifier que l'utilisateur est le propriétaire ou un admin
    if (avis.utilisateur_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres avis.' });
    }

    await avisService.delete(req.params.id);
    res.json({ message: 'Avis supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
