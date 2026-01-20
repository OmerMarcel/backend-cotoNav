const express = require('express');
const userService = require('../services/userService');
const { auth, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Obtenir tous les utilisateurs (avec filtres de zone)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.actif !== undefined) filters.actif = req.query.actif === 'true';

    // Admin ne peut voir que les utilisateurs de sa zone
    if (req.user.role === 'admin' && req.user.zone_id) {
      filters.zone_id = req.user.zone_id;
    }
    // Super Admin peut voir tous les utilisateurs ou filtrer par zone
    else if (req.query.zone_id && req.user.role === 'super_admin') {
      filters.zone_id = req.query.zone_id;
    }

    const { data: users, count } = await userService.findAll(filters, { page, limit });

    // Retirer les mots de passe
    const usersWithoutPassword = users.map(({ password, ...user }) => user);

    res.json({
      users: usersWithoutPassword,
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

// Obtenir un utilisateur par ID
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Admin ne peut voir que les utilisateurs de sa zone
    if (req.user.role === 'admin' && user.zone_id !== req.user.zone_id) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez voir que les utilisateurs de votre zone.' 
      });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mettre à jour le rôle d'un utilisateur (Super Admin uniquement)
router.patch('/:id/role', auth, requirePermission('manage_citoyens'), async (req, res) => {
  try {
    const { role } = req.body;

    // Vérifier les rôles valides
    const validRoles = ['citoyen', 'agent_communal', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      // Support rétrocompatibilité pour 'moderateur'
      if (role === 'moderateur') {
        // Traiter comme admin
        role = 'admin';
      } else {
        return res.status(400).json({ message: 'Rôle invalide.' });
      }
    }

    // Super Admin uniquement peut promouvoir en super_admin ou admin
    if ((role === 'super_admin' || role === 'admin') && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Seul un Super Admin peut promouvoir en Super Admin ou Admin.' 
      });
    }

    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Admin ne peut modifier que les utilisateurs de sa zone
    if (req.user.role === 'admin' && user.zone_id !== req.user.zone_id) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez modifier que les utilisateurs de votre zone.' 
      });
    }

    const updatedUser = await userService.update(req.params.id, { role });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Activer/Désactiver un utilisateur
router.patch('/:id/actif', auth, requirePermission('manage_citoyens'), async (req, res) => {
  try {
    const { actif } = req.body;

    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Admin ne peut modifier que les utilisateurs de sa zone
    if (req.user.role === 'admin' && user.zone_id !== req.user.zone_id) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez modifier que les utilisateurs de votre zone.' 
      });
    }

    // Ne pas permettre de se désactiver soi-même
    if (user.id === req.user.id && !actif) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas désactiver votre propre compte.' 
      });
    }

    const updatedUser = await userService.update(req.params.id, { actif });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

