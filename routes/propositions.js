const express = require('express');
const propositionService = require('../services/propositionService');
const infrastructureService = require('../services/infrastructureService');
const { auth, adminOnly } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Créer une nouvelle proposition (pour mobile)
router.post('/', auth, async (req, res) => {
  try {
    // Log pour débogage
    console.log('📥 Nouvelle proposition reçue de l\'utilisateur:', req.user.id);
    console.log('📋 Données reçues:', {
      name: req.body.name,
      category: req.body.category,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      address: req.body.address,
      imagesCount: req.body.images?.length || 0
    });

    // Construire l'objet de localisation
    const localisation = {
      type: 'Point',
      coordinates: [req.body.longitude || 0, req.body.latitude || 0],
      adresse: req.body.address || req.body.adresse || '',
      quartier: req.body.quartier || '',
      commune: req.body.commune || 'Cotonou'
    };

    // Construire l'objet contact si phone ou website sont fournis
    const contact = {};
    if (req.body.phone) contact.telephone = req.body.phone;
    if (req.body.website) contact.website = req.body.website;

    const propositionData = {
      nom: req.body.name || req.body.nom,
      type: req.body.category || req.body.type,
      description: req.body.description || '',
      localisation: localisation,
      photos: req.body.images || req.body.photos || [],
      propose_par: req.user.id, // ID utilisateur extrait du token JWT
      statut: 'en_attente',
      horaires: req.body.horaires || req.body.openingHours || {},
      equipements: req.body.equipements || req.body.equipments || [],
      ...(Object.keys(contact).length > 0 && { contact: contact })
    };

    console.log('💾 Données à insérer dans Supabase:', {
      nom: propositionData.nom,
      type: propositionData.type,
      propose_par: propositionData.propose_par,
      statut: propositionData.statut
    });

    const proposition = await propositionService.create(propositionData);
    
    console.log('✅ Proposition créée avec succès, ID:', proposition.id);
    
    res.status(201).json({ 
      data: proposition,
      message: 'Proposition créée avec succès.' 
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la proposition:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création de la proposition.', 
      error: error.message 
    });
  }
});

// Obtenir les propositions de l'utilisateur connecté (pour mobile)
router.get('/mine', auth, async (req, res) => {
  try {
    const { data: propositions } = await propositionService.findByUserId(req.user.id);
    res.json({ data: propositions || [] });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir toutes les propositions (admin seulement)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {};
    if (req.query.statut) filters.statut = req.query.statut;

    const { data: propositions, count } = await propositionService.findAll(
      filters,
      { page, limit }
    );

    res.json({
      data: propositions,
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

// Approuver une proposition (créer l'infrastructure)
router.post('/:id/approuver', auth, adminOnly, async (req, res) => {
  try {
    console.log('📋 Approbation de la proposition:', req.params.id);
    
    // Récupérer les données brutes pour avoir accès à tous les champs originaux
    const propositionRaw = await propositionService.findByIdRaw(req.params.id);
    const proposition = await propositionService.findById(req.params.id);

    if (!proposition) {
      console.error('❌ Proposition non trouvée:', req.params.id);
      return res.status(404).json({ message: 'Proposition non trouvée.' });
    }

    console.log('📄 Proposition trouvée:', {
      id: proposition.id,
      nom: proposition.nom,
      statut: proposition.statut,
      propose_par: proposition.propose_par
    });

    if (proposition.statut !== 'en_attente') {
      console.warn('⚠️ Proposition déjà traitée:', proposition.statut);
      return res.status(400).json({ message: 'Cette proposition a déjà été traitée.' });
    }

    // Utiliser les données brutes pour avoir les champs originaux
    // Extraire l'ID de propose_par (peut être un objet ou un ID)
    let proposeParId = propositionRaw.propose_par;
    if (typeof proposeParId === 'object' && proposeParId !== null) {
      proposeParId = proposeParId.id || proposeParId._id;
    }
    if (!proposeParId) {
      throw new Error('Impossible de déterminer l\'auteur de la proposition.');
    }
    
    // S'assurer que localisation est dans le bon format
    let localisation = propositionRaw.localisation;
    if (!localisation || typeof localisation !== 'object') {
      throw new Error('La localisation de la proposition est invalide.');
    }
    
    // S'assurer que localisation a le format GeoJSON Point
    if (!localisation.type || localisation.type !== 'Point') {
      localisation.type = 'Point';
    }
    if (!Array.isArray(localisation.coordinates) || localisation.coordinates.length !== 2) {
      throw new Error('Les coordonnées de localisation sont invalides.');
    }

    // Construire le contact si nécessaire
    let contact = propositionRaw.contact || {};
    if (proposition.phone || proposition.website) {
      contact = {
        ...contact,
        telephone: proposition.phone || contact.telephone,
        website: proposition.website || contact.website
      };
    }

    // Préparer les données pour l'infrastructure
    const infrastructureData = {
      nom: propositionRaw.nom,
      type: propositionRaw.type,
      description: propositionRaw.description || '',
      localisation: localisation,
      photos: Array.isArray(propositionRaw.photos) ? propositionRaw.photos : [],
      horaires: propositionRaw.horaires || {},
      equipements: Array.isArray(propositionRaw.equipements) ? propositionRaw.equipements : [],
      contact: contact,
      creePar: proposeParId,
      valide: true,
      validePar: req.user.id,
      valideLe: new Date().toISOString()
    };

    console.log('🏗️ Création de l\'infrastructure avec les données:', {
      nom: infrastructureData.nom,
      type: infrastructureData.type,
      creePar: infrastructureData.creePar,
      photosCount: infrastructureData.photos?.length || 0
    });

    // Créer l'infrastructure
    const infrastructure = await infrastructureService.create(infrastructureData);

    console.log('✅ Infrastructure créée:', infrastructure.id);

    // Mettre à jour la proposition
    await propositionService.update(req.params.id, {
      statut: 'approuve',
      modere_par: req.user.id,
      modere_le: new Date().toISOString(),
      commentaire_moderation: req.body.commentaire || ''
    });

    console.log('✅ Proposition mise à jour avec statut approuve');

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
      console.warn('⚠️ Notification push nouvelle infrastructure (proposition approuvée) échouée:', e.message);
    }

    res.json({ 
      message: 'Proposition approuvée et infrastructure créée.', 
      infrastructure 
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'approbation:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'approbation.', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rejeter une proposition
router.post('/:id/rejeter', auth, adminOnly, async (req, res) => {
  try {
    const proposition = await propositionService.update(req.params.id, {
      statut: 'rejete',
      modere_par: req.user.id,
      modere_le: new Date().toISOString(),
      commentaire_moderation: req.body.commentaire || ''
    });

    if (!proposition) {
      return res.status(404).json({ message: 'Proposition non trouvée.' });
    }

    // Envoyer une notification push aux utilisateurs (citoyens) pour proposition rejetée
    try {
      await notificationService.sendPushOnly({
        roles: ['citoyen'],
        title: `Proposition d'infrastructure rejetée`,
        body: `La proposition "${proposition.nom || proposition.name || 'd\'infrastructure'}" a été rejetée`,
        href: `/proposition/${proposition.id}`,
        type: 'proposition',
      });
    } catch (e) {
      console.warn('⚠️ Notification push proposition rejetée échouée:', e.message);
    }

    res.json({ message: 'Proposition rejetée.', proposition });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

