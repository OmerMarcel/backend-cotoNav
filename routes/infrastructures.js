const express = require('express');
const multer = require('multer');
const infrastructureService = require('../services/infrastructureService');
const { auth, adminOnly } = require('../middleware/auth');
const supabase = require('../config/supabase');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Configuration multer pour les fichiers en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Obtenir toutes les infrastructures (avec pagination et filtres)
// Accès public pour la lecture (pas besoin d'auth)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.category) filters.type = req.query.category; // Alias pour compatibilité Flutter
    if (req.query.quartier) filters.quartier = req.query.quartier;
    if (req.query.valide !== undefined) filters.valide = req.query.valide === 'true';
    if (req.query.etat) filters.etat = req.query.etat;
    if (req.query.q) filters.searchQuery = req.query.q; // Recherche par texte
    
    // Paramètres de géolocalisation pour recherche par proximité
    const latitude = req.query.latitude ? parseFloat(req.query.latitude) : null;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius) : null;

    const { data: infrastructures, count } = await infrastructureService.findAll(
      filters,
      { page, limit, latitude, longitude, radius }
    );

    // Format compatible avec Flutter (peut accepter soit data soit directement la liste)
    // Si c'est une recherche simple (paramètre q), retourner directement la liste
    if (req.query.q && !req.query.page) {
      return res.json(infrastructures);
    }
    
    res.json({
      data: infrastructures,
      infrastructures, // Pour compatibilité dashboard
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur serveur.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir une infrastructure par ID
// Accès public pour la lecture (pas besoin d'auth)
router.get('/:id', async (req, res) => {
  try {
    const infrastructure = await infrastructureService.findById(req.params.id);

    if (!infrastructure) {
      return res.status(404).json({ message: 'Infrastructure non trouvée.' });
    }

    // Format compatible avec Flutter
    res.json({
      data: infrastructure
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Créer une infrastructure
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const infrastructure = await infrastructureService.create({
      ...req.body,
      creePar: req.user.id,
      valide: true,
      validePar: req.user.id,
      valideLe: new Date().toISOString()
    });

    // Envoyer une notification push aux utilisateurs (citoyens) pour nouvelle infrastructure mise en ligne
    try {
      await notificationService.sendPushOnly({
        roles: ['citoyen'],
        title: `Nouvelle infrastructure disponible`,
        body: `${infrastructure.name || infrastructure.nom || 'Une nouvelle infrastructure'} vient d'être ajoutée`,
        href: `/infrastructure/${infrastructure.id}`,
        type: 'infrastructure',
      });
    } catch (e) {
      console.warn('⚠️ Notification push nouvelle infrastructure échouée:', e.message);
    }

    res.status(201).json(infrastructure);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(400).json({ message: 'Erreur lors de la création.', error: error.message });
  }
});

// Mettre à jour une infrastructure
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    // Récupérer l'infrastructure avant la mise à jour pour détecter les changements de statut
    const oldInfrastructure = await infrastructureService.findById(req.params.id);
    
    const infrastructure = await infrastructureService.update(req.params.id, {
      ...req.body,
      updated_at: new Date().toISOString()
    });

    if (!infrastructure) {
      return res.status(404).json({ message: 'Infrastructure non trouvée.' });
    }

    // Si le statut a changé vers "valide" ou "en_cours", envoyer une notification
    const oldValide = oldInfrastructure?.valide || oldInfrastructure?.is_verified || false;
    const newValide = infrastructure?.valide || infrastructure?.is_verified || false;
    const oldEtat = oldInfrastructure?.etat || oldInfrastructure?.is_active;
    const newEtat = req.body.etat;

    // Notification si infrastructure devient validée
    if (!oldValide && newValide) {
      try {
        await notificationService.sendPushOnly({
          roles: ['citoyen'],
          title: `Infrastructure validée`,
          body: `${infrastructure.name || infrastructure.nom || 'Une infrastructure'} a été validée et est maintenant disponible`,
          href: `/infrastructure/${infrastructure.id}`,
          type: 'infrastructure',
        });
      } catch (e) {
        console.warn('⚠️ Notification push infrastructure validée échouée:', e.message);
      }
    }

    // Notification si l'état change vers "en_cours" ou autre statut de traitement
    if (newEtat && newEtat !== oldEtat && (newEtat === 'en_cours' || newEtat === 'en_traitement')) {
      try {
        await notificationService.sendPushOnly({
          roles: ['citoyen'],
          title: `Infrastructure en cours de traitement`,
          body: `${infrastructure.name || infrastructure.nom || 'Une infrastructure'} est en cours de traitement`,
          href: `/infrastructure/${infrastructure.id}`,
          type: 'infrastructure',
        });
      } catch (e) {
        console.warn('⚠️ Notification push infrastructure en traitement échouée:', e.message);
      }
    }

    res.json(infrastructure);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
});

// Valider une infrastructure
router.patch('/:id/valider', auth, adminOnly, async (req, res) => {
  try {
    const infrastructure = await infrastructureService.validate(req.params.id, req.user.id);

    if (!infrastructure) {
      return res.status(404).json({ message: 'Infrastructure non trouvée.' });
    }

    // Envoyer une notification push aux utilisateurs (citoyens) pour nouvelle infrastructure validée
    try {
      await notificationService.sendPushOnly({
        roles: ['citoyen'],
        title: `Nouvelle infrastructure validée`,
        body: `${infrastructure.name || infrastructure.nom || 'Une infrastructure'} est maintenant disponible près de vous`,
        href: `/infrastructure/${infrastructure.id}`,
        type: 'infrastructure',
      });
    } catch (e) {
      console.warn('⚠️ Notification push infrastructure validée échouée:', e.message);
    }

    res.json(infrastructure);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Supprimer une infrastructure
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await infrastructureService.delete(req.params.id);
    res.json({ message: 'Infrastructure supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Upload d'images pour une infrastructure
router.post('/upload-images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucune image fournie.' });
    }

    const uploadedPhotos = [];
    let useBase64Fallback = false;

    for (const file of req.files) {
      try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `infrastructures/${fileName}`;

        // Essayer d'uploader vers Supabase Storage
        const { data, error } = await supabase.storage
          .from('infrastructures')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) {
          // Si erreur (bucket non configuré), utiliser base64 comme fallback
          if (error.message && error.message.includes('Bucket')) {
            useBase64Fallback = true;
            const base64 = file.buffer.toString('base64');
            const dataUrl = `data:${file.mimetype};base64,${base64}`;
            
            uploadedPhotos.push({
              url: dataUrl,
              uploadedAt: new Date().toISOString()
            });
            continue;
          }
          console.error('Erreur upload:', error);
          continue;
        }

        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage
          .from('infrastructures')
          .getPublicUrl(filePath);

        uploadedPhotos.push({
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString()
        });
      } catch (uploadError) {
        console.error('Erreur lors de l\'upload d\'une image:', uploadError);
        // En cas d'erreur, utiliser base64 comme fallback
        const base64 = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64}`;
        
        uploadedPhotos.push({
          url: dataUrl,
          uploadedAt: new Date().toISOString()
        });
      }
    }

    if (uploadedPhotos.length === 0) {
      return res.status(500).json({ message: 'Erreur lors de l\'upload des images.' });
    }

    res.json({ 
      photos: uploadedPhotos,
      warning: useBase64Fallback ? 'Les images sont stockées en base64 car Supabase Storage n\'est pas configuré.' : undefined
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload.' });
  }
});

// Favoris
router.get('/favorites', auth, async (req, res) => {
  try {
    console.log('📥 Requête de récupération des favoris:');
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

router.post('/:id/favorite', auth, async (req, res) => {
  try {
    await infrastructureService.addFavorite(req.user.id, req.params.id);
    res.json({ message: 'Infrastructure ajoutée aux favoris.' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout aux favoris.' });
  }
});

router.delete('/:id/favorite', auth, async (req, res) => {
  try {
    // Si l'utilisateur est super_admin, admin, agent_communal ou modérateur, supprimer tous les favoris de cette infrastructure
    // Sinon, supprimer seulement le favori de l'utilisateur
    if (
      req.user.role === 'super_admin' ||
      req.user.role === 'admin' ||
      req.user.role === 'agent_communal' ||
      req.user.role === 'moderateur'
    ) {
      await infrastructureService.removeAllFavoritesForInfrastructure(req.params.id);
      res.json({ message: 'Tous les favoris de cette infrastructure ont été supprimés.' });
    } else {
      await infrastructureService.removeFavorite(req.user.id, req.params.id);
      res.json({ message: 'Infrastructure retirée des favoris.' });
    }
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du favori.' });
  }
});

module.exports = router;

