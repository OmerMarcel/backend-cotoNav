const express = require('express');
const auditService = require('../services/auditService');
const { auth, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Obtenir les logs d'audit (Super Admin voit tout, Admin voit sa zone)
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const filters = {};
    if (req.query.user_id) filters.user_id = req.query.user_id;
    if (req.query.action) filters.action = req.query.action;
    if (req.query.resource_type) filters.resource_type = req.query.resource_type;
    if (req.query.resource_id) filters.resource_id = req.query.resource_id;
    if (req.query.date_from) filters.date_from = req.query.date_from;
    if (req.query.date_to) filters.date_to = req.query.date_to;

    // Admin ne peut voir que les logs de sa zone
    if (req.user.role === 'admin') {
      filters.zone_id = req.user.zone_id;
    } else if (req.user.role === 'agent_communal') {
      // Agent ne peut voir que ses propres logs
      filters.user_id = req.user.id;
    } else if (req.user.role !== 'super_admin') {
      // Les autres rôles n'ont pas accès
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    if (req.query.zone_id && req.user.role === 'super_admin') {
      filters.zone_id = req.query.zone_id;
    }

    const { data: logs, count } = await auditService.getLogs(filters, { page, limit });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir les logs d'une zone spécifique
router.get('/zone/:zoneId', auth, requirePermission('view_zone_logs'), async (req, res) => {
  try {
    const zoneId = req.params.zoneId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Admin ne peut voir que les logs de sa zone
    if (req.user.role === 'admin' && req.user.zone_id !== zoneId) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez voir que les logs de votre zone.' 
      });
    }

    const filters = {};
    if (req.query.user_id) filters.user_id = req.query.user_id;
    if (req.query.action) filters.action = req.query.action;
    if (req.query.resource_type) filters.resource_type = req.query.resource_type;

    const { data: logs, count } = await auditService.getZoneLogs(zoneId, filters, { page, limit });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir les logs d'un utilisateur spécifique
router.get('/user/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Admin ne peut voir que les logs des utilisateurs de sa zone
    if (req.user.role === 'admin') {
      const user = await require('../services/userService').findById(userId);
      if (user && user.zone_id !== req.user.zone_id) {
        return res.status(403).json({ 
          message: 'Vous ne pouvez voir que les logs des utilisateurs de votre zone.' 
        });
      }
    }

    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.resource_type) filters.resource_type = req.query.resource_type;

    const { data: logs, count } = await auditService.getUserLogs(userId, filters, { page, limit });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Obtenir les logs d'une ressource spécifique
router.get('/resource/:resourceType/:resourceId', auth, requireAdmin, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const { data: logs, count } = await auditService.getResourceLogs(
      resourceType,
      resourceId,
      { page, limit }
    );

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

