const express = require('express');
const { body, validationResult } = require('express-validator');
const userService = require('../services/userService');
const zoneService = require('../services/zoneService');
const signalementService = require('../services/signalementService');
const propositionService = require('../services/propositionService');
const infrastructureService = require('../services/infrastructureService');
const auditService = require('../services/auditService');
const { auth, requireAdmin } = require('../middleware/auth');
const { requirePermission, logAction } = require('../middleware/permissions');

const router = express.Router();

// Obtenir le profil personnel de l'utilisateur connecté
router.get('/me', auth, async (req, res) => {
  try {
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Récupérer les informations de zone si assignée
    let zone = null;
    if (user.zone_id) {
      zone = await zoneService.findById(user.zone_id);
    }

    // Récupérer les statistiques de l'utilisateur
    let stats = {
      infrastructuresCrees: 0,
      propositionsValidees: 0,
      signalementsTraites: 0,
      avisLaissee: 0,
    };

    // Récupérer les statistiques selon le rôle
    if (user.role === 'agent_communal' || user.role === 'admin') {
      // Infrastructures créées
      const infrastructures = await infrastructureService.findByCreator(req.user.id);
      stats.infrastructuresCrees = infrastructures.length || 0;

      // Propositions validées
      const propositions = await propositionService.findByValidator(req.user.id);
      stats.propositionsValidees = propositions.length || 0;

      // Signalements traités
      const signalements = await signalementService.findByHandler(req.user.id);
      stats.signalementsTraites = signalements.length || 0;
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      user: {
        ...userWithoutPassword,
        zone,
      },
      stats,
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mettre à jour le profil personnel
router.patch('/me', auth, logAction('UPDATE_PROFILE', 'user'), [
  body('nom').optional().trim().notEmpty(),
  body('prenom').optional().trim().notEmpty(),
  body('telephone').optional().trim(),
  body('avatar').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.nom) updates.nom = req.body.nom;
    if (req.body.prenom) updates.prenom = req.body.prenom;
    if (req.body.telephone) updates.telephone = req.body.telephone;
    if (req.body.avatar) updates.avatar = req.body.avatar;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour.' });
    }

    const updatedUser = await userService.update(req.user.id, updates);

    // Récupérer la zone si assignée
    let zone = null;
    if (updatedUser.zone_id) {
      zone = await zoneService.findById(updatedUser.zone_id);
    }

    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      user: {
        ...userWithoutPassword,
        zone,
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir le profil détaillé d'un utilisateur (Super Admin et Admin uniquement)
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUser = req.user;

    // Récupérer l'utilisateur
    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier les permissions
    // Admin ne peut voir que les utilisateurs de sa zone
    if (requestingUser.role === 'admin' && user.zone_id !== requestingUser.zone_id) {
      return res.status(403).json({
        message: 'Vous ne pouvez voir que les utilisateurs de votre zone.',
      });
    }

    // Récupérer les informations de zone
    let zone = null;
    if (user.zone_id) {
      zone = await zoneService.findById(user.zone_id);
    }

    // Récupérer qui a créé le compte
    let creePar = null;
    if (user.cree_par) {
      const creator = await userService.findById(user.cree_par);
      if (creator) {
        const { password, ...creatorWithoutPassword } = creator;
        creePar = creatorWithoutPassword;
      }
    }

    // Récupérer les statistiques et détails selon le rôle
    let details = {
      infrastructuresCrees: [],
      infrastructuresCreesCount: 0,
      propositionsValidees: [],
      propositionsValideesCount: 0,
      signalementsTraites: [],
      signalementsTraitesCount: 0,
      signalementsAssignes: [],
      signalementsAssignesCount: 0,
      tachesAssignees: [],
      tachesAssigneesCount: 0,
      activiteRecente: [],
    };

    if (user.role === 'agent_communal' || user.role === 'admin') {
      // Infrastructures créées
      const infrastructures = await infrastructureService.findByCreator(userId);
      details.infrastructuresCrees = infrastructures || [];
      details.infrastructuresCreesCount = infrastructures?.length || 0;

      // Propositions validées
      const propositions = await propositionService.findByValidator(userId);
      details.propositionsValidees = propositions || [];
      details.propositionsValideesCount = propositions?.length || 0;

      // Signalements traités
      const signalements = await signalementService.findByHandler(userId);
      details.signalementsTraites = signalements || [];
      details.signalementsTraitesCount = signalements?.length || 0;

      // Pour les agents : signalements assignés
      if (user.role === 'agent_communal') {
        const signalementsAssignes = await signalementService.findAssigned(userId);
        details.signalementsAssignes = signalementsAssignes || [];
        details.signalementsAssignesCount = signalementsAssignes?.length || 0;
      }
    }

    // Récupérer l'activité récente (derniers logs d'audit)
    const logs = await auditService.getUserLogs(userId, {}, { page: 1, limit: 10 });
    details.activiteRecente = logs.data || [];

    const { password, ...userWithoutPassword } = user;

    res.json({
      user: {
        ...userWithoutPassword,
        zone,
        creePar,
      },
      details,
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Supprimer un compte utilisateur (Super Admin uniquement pour admins/agents, Admin pour agents de sa zone)
router.delete('/:id', auth, requirePermission('manage_agents'), logAction('DELETE_USER', 'user'), async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUser = req.user;

    // Récupérer l'utilisateur à supprimer
    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier les permissions
    if (requestingUser.role === 'admin') {
      // Admin ne peut supprimer que les agents de sa zone
      if (user.role !== 'agent_communal' || user.zone_id !== requestingUser.zone_id) {
        return res.status(403).json({
          message: 'Vous ne pouvez supprimer que les agents de votre zone.',
        });
      }
    } else if (requestingUser.role === 'super_admin') {
      // Super Admin peut supprimer admins et agents
      if (user.role !== 'admin' && user.role !== 'agent_communal') {
        return res.status(403).json({
          message: 'Vous ne pouvez supprimer que les administrateurs et agents.',
        });
      }
    } else {
      return res.status(403).json({
        message: 'Permission refusée.',
      });
    }

    // Ne pas permettre de se supprimer soi-même
    if (userId === requestingUser.id) {
      return res.status(400).json({
        message: 'Vous ne pouvez pas supprimer votre propre compte.',
      });
    }

    // Soft delete : désactiver le compte au lieu de le supprimer
    await userService.update(userId, { actif: false });

    // Logger l'action
    await auditService.log({
      user_id: requestingUser.id,
      action: 'DELETE_USER',
      resource_type: 'user',
      resource_id: userId,
      details: {
        deleted_user_email: user.email,
        deleted_user_role: user.role,
        deleted_user_zone_id: user.zone_id,
      },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      zone_id: user.zone_id,
    });

    res.json({
      message: 'Compte désactivé avec succès.',
      deletedUser: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

