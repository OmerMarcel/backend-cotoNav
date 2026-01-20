const express = require('express');
const { body, validationResult } = require('express-validator');
const zoneService = require('../services/zoneService');
const { auth, requireSuperAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/permissions');
const auditService = require('../services/auditService');

const router = express.Router();

// Créer une zone (Super Admin uniquement)
router.post(
  '/',
  auth,
  requireSuperAdmin,
  logAction('CREATE_ZONE', 'zone'),
  [
    body('nom').notEmpty().trim(),
    body('type').isIn(['arrondissement', 'secteur', 'quartier']),
    body('parent_id').optional().isUUID(),
    body('limites').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nom, type, parent_id, limites } = req.body;

      // Si parent_id fourni, vérifier qu'il existe
      if (parent_id) {
        const parent = await zoneService.findById(parent_id);
        if (!parent || !parent.actif) {
          return res.status(400).json({ message: 'Zone parente invalide.' });
        }
      }

      const zone = await zoneService.create({
        nom,
        type,
        parent_id: parent_id || null,
        limites: limites || null,
        actif: true,
      });

      await auditService.log({
        user_id: req.user.id,
        action: 'CREATE_ZONE',
        resource_type: 'zone',
        resource_id: zone.id,
        details: { nom, type, parent_id },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(201).json({
        message: 'Zone créée avec succès.',
        zone,
      });
    } catch (error) {
      console.error('Erreur lors de la création de la zone:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la création de la zone.' });
    }
  }
);

// Lister toutes les zones
router.get('/', auth, async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.parent_id !== undefined) {
      filters.parent_id = req.query.parent_id === 'null' ? null : req.query.parent_id;
    }
    if (req.query.actif !== undefined) {
      filters.actif = req.query.actif === 'true';
    }

    const zones = await zoneService.findAll(filters);
    res.json({ zones });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir une zone par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const zone = await zoneService.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Zone non trouvée.' });
    }
    res.json({ zone });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir les utilisateurs d'une zone
router.get('/:id/users', auth, async (req, res) => {
  try {
    const zoneId = req.params.id;
    const role = req.query.role;

    // Vérifier l'accès à la zone
    if (req.user.role !== 'super_admin') {
      if (req.user.zone_id !== zoneId) {
        return res.status(403).json({ 
          message: 'Accès refusé. Cette zone ne vous est pas assignée.' 
        });
      }
    }

    const users = await zoneService.getZoneUsers(zoneId, role);
    const usersWithoutPassword = users.map(({ password, ...user }) => user);

    res.json({ users: usersWithoutPassword });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mettre à jour une zone (Super Admin uniquement)
router.patch(
  '/:id',
  auth,
  requireSuperAdmin,
  logAction('UPDATE_ZONE', 'zone'),
  [
    body('nom').optional().notEmpty().trim(),
    body('type').optional().isIn(['arrondissement', 'secteur', 'quartier']),
    body('parent_id').optional().isUUID(),
    body('limites').optional().isObject(),
    body('actif').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const zoneId = req.params.id;
      const updates = req.body;

      // Vérifier que la zone existe
      const existingZone = await zoneService.findById(zoneId);
      if (!existingZone) {
        return res.status(404).json({ message: 'Zone non trouvée.' });
      }

      // Vérifier parent_id si fourni
      if (updates.parent_id && updates.parent_id !== existingZone.parent_id) {
        const parent = await zoneService.findById(updates.parent_id);
        if (!parent || !parent.actif) {
          return res.status(400).json({ message: 'Zone parente invalide.' });
        }
      }

      const zone = await zoneService.update(zoneId, updates);

      await auditService.log({
        user_id: req.user.id,
        action: 'UPDATE_ZONE',
        resource_type: 'zone',
        resource_id: zoneId,
        details: updates,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        zone_id: zoneId,
      });

      res.json({
        message: 'Zone mise à jour avec succès.',
        zone,
      });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

// Supprimer une zone (Super Admin uniquement - soft delete)
router.delete(
  '/:id',
  auth,
  requireSuperAdmin,
  logAction('DELETE_ZONE', 'zone'),
  async (req, res) => {
    try {
      const zoneId = req.params.id;

      const zone = await zoneService.findById(zoneId);
      if (!zone) {
        return res.status(404).json({ message: 'Zone non trouvée.' });
      }

      // Vérifier qu'aucun utilisateur n'est assigné à cette zone
      const users = await zoneService.getZoneUsers(zoneId);
      if (users.length > 0) {
        return res.status(400).json({ 
          message: 'Impossible de supprimer la zone. Des utilisateurs y sont assignés.' 
        });
      }

      await zoneService.delete(zoneId);

      await auditService.log({
        user_id: req.user.id,
        action: 'DELETE_ZONE',
        resource_type: 'zone',
        resource_id: zoneId,
        details: { nom: zone.nom },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        zone_id: zoneId,
      });

      res.json({ message: 'Zone supprimée avec succès.' });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

module.exports = router;

