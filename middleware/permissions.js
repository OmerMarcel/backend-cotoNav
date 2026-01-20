const userService = require('../services/userService');
let auditService;
try {
  auditService = require('../services/auditService');
} catch (error) {
  console.warn('⚠️  Service d\'audit non disponible:', error.message);
  // Fallback pour éviter les erreurs
  auditService = {
    log: async () => null,
  };
}

/**
 * Matrice des permissions par rôle
 */
const PERMISSIONS = {
  super_admin: {
    // Gestion des utilisateurs
    manage_super_admins: true,
    manage_admins: true,
    manage_agents: true,
    manage_citoyens: true,
    
    // Gestion des données
    view_all_data: true,
    modify_all_data: true,
    delete_all_data: true,
    
    // Gestion des infrastructures
    create_infrastructure: true,
    modify_any_infrastructure: true,
    delete_any_infrastructure: true,
    validate_any_infrastructure: true,
    
    // Gestion des propositions
    view_all_propositions: true,
    validate_any_proposition: true,
    reject_any_proposition: true,
    
    // Gestion des signalements
    view_all_signalements: true,
    handle_any_signalement: true,
    escalate_signalement: true,
    
    // Modération
    moderate_all_content: true,
    delete_any_review: true,
    suspend_any_user: true,
    
    // Rapports
    view_global_reports: true,
    export_all_data: true,
    
    // Configuration
    configure_system: true,
    manage_backups: true,
    view_all_logs: true,
    
    // Zones
    manage_zones: true,
    assign_zones: true,
  },
  
  admin: {
    // Gestion des utilisateurs
    manage_super_admins: false,
    manage_admins: false,
    manage_agents: true, // Dans sa zone uniquement
    manage_citoyens: true, // Dans sa zone uniquement
    
    // Gestion des données
    view_all_data: false,
    modify_all_data: false,
    delete_all_data: false,
    view_zone_data: true, // Sa zone uniquement
    modify_zone_data: true,
    delete_zone_data: true,
    
    // Gestion des infrastructures
    create_infrastructure: true,
    modify_any_infrastructure: false,
    modify_zone_infrastructure: true,
    delete_zone_infrastructure: true,
    validate_any_infrastructure: false,
    validate_zone_infrastructure: true,
    
    // Gestion des propositions
    view_all_propositions: false,
    view_zone_propositions: true,
    validate_any_proposition: false,
    validate_zone_proposition: true,
    reject_any_proposition: false,
    reject_zone_proposition: true,
    
    // Gestion des signalements
    view_all_signalements: false,
    view_zone_signalements: true,
    handle_any_signalement: false,
    handle_zone_signalement: true,
    assign_signalement: true, // Aux agents de sa zone
    escalate_signalement: true,
    
    // Modération
    moderate_all_content: false,
    moderate_zone_content: true,
    delete_any_review: false,
    delete_zone_review: true,
    suspend_any_user: false,
    suspend_zone_user: true,
    
    // Rapports
    view_global_reports: false,
    view_zone_reports: true,
    export_all_data: false,
    export_zone_data: true,
    
    // Configuration
    configure_system: false,
    manage_backups: false,
    view_all_logs: false,
    view_zone_logs: true,
    
    // Zones
    manage_zones: false,
    assign_zones: false, // Ne peut pas assigner, mais peut voir les agents de sa zone
  },
  
  agent_communal: {
    // Gestion des utilisateurs
    manage_super_admins: false,
    manage_admins: false,
    manage_agents: false,
    manage_citoyens: false,
    
    // Gestion des données
    view_all_data: false,
    modify_all_data: false,
    delete_all_data: false,
    view_zone_data: true, // Sa zone uniquement
    modify_zone_data: true,
    delete_zone_data: false, // Ne peut pas supprimer définitivement
    
    // Gestion des infrastructures
    create_infrastructure: true,
    modify_any_infrastructure: false,
    modify_zone_infrastructure: true,
    delete_zone_infrastructure: false,
    validate_any_infrastructure: false,
    validate_zone_infrastructure: true, // Peut proposer validation
    
    // Gestion des propositions
    view_all_propositions: false,
    view_zone_propositions: true,
    validate_any_proposition: false,
    validate_zone_proposition: true, // Peut valider pour admin
    reject_any_proposition: false,
    reject_zone_proposition: false, // Ne peut pas rejeter directement
    
    // Gestion des signalements
    view_all_signalements: false,
    view_zone_signalements: true,
    view_assigned_signalements: true,
    handle_any_signalement: false,
    handle_assigned_signalement: true,
    assign_signalement: false,
    escalate_signalement: true,
    
    // Modération
    moderate_all_content: false,
    moderate_zone_content: false,
    delete_any_review: false,
    delete_zone_review: false,
    suspend_any_user: false,
    suspend_zone_user: false,
    view_reviews: true,
    respond_to_reviews: true,
    
    // Rapports
    view_global_reports: false,
    view_zone_reports: true,
    export_all_data: false,
    export_zone_data: true,
    
    // Configuration
    configure_system: false,
    manage_backups: false,
    view_all_logs: false,
    view_own_logs: true,
    
    // Zones
    manage_zones: false,
    assign_zones: false,
  },
  
  citoyen: {
    // Les citoyens n'ont pas accès au dashboard admin
    // Leurs permissions sont gérées dans l'application mobile
  }
};

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
function hasPermission(user, permission) {
  const rolePermissions = PERMISSIONS[user.role];
  if (!rolePermissions) {
    return false;
  }
  
  return rolePermissions[permission] === true;
}

/**
 * Middleware pour vérifier une permission spécifique
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      // Récupérer l'utilisateur complet avec zone si nécessaire
      const user = await userService.findById(req.user.id);
      
      if (!user || !user.actif) {
        return res.status(401).json({ message: 'Utilisateur non autorisé.' });
      }
      
      // Les super_admins ont tous les droits
      if (user.role === 'super_admin') {
        req.user = user;
        return next();
      }
      
      // Vérifier la permission
      if (!hasPermission(user, permission)) {
        return res.status(403).json({ 
          message: `Permission refusée. Cette action nécessite la permission: ${permission}` 
        });
      }
      
      // Ajouter les infos de zone à req.user pour les vérifications de zone
      req.user = user;
      next();
    } catch (error) {
      console.error('Erreur dans requirePermission:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions.' });
    }
  };
}

/**
 * Middleware pour vérifier l'accès à une zone spécifique
 */
function requireZoneAccess() {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // Super admin a accès à toutes les zones
      if (user.role === 'super_admin') {
        return next();
      }
      
      // Admin et Agent doivent avoir une zone assignée
      if (!user.zone_id) {
        return res.status(403).json({ 
          message: 'Aucune zone assignée. Contactez votre administrateur.' 
        });
      }
      
      // Vérifier si la ressource appartient à la zone de l'utilisateur
      const zoneId = req.params.zoneId || req.body.zone_id || req.query.zone_id;
      
      if (zoneId && zoneId !== user.zone_id) {
        // Pour les admins, on peut leur permettre d'accéder aux sous-zones
        // Pour l'instant, on vérifie l'égalité stricte
        if (user.role !== 'admin') {
          return res.status(403).json({ 
            message: 'Accès refusé. Cette ressource n\'appartient pas à votre zone.' 
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Erreur dans requireZoneAccess:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };
}

/**
 * Middleware pour vérifier que l'utilisateur est super_admin
 */
function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      message: 'Accès refusé. Droits Super Admin requis.' 
    });
  }
  next();
}

/**
 * Middleware pour vérifier que l'utilisateur est admin ou super_admin
 */
function requireAdmin(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Accès refusé. Droits administrateur requis.' 
    });
  }
  next();
}

/**
 * Middleware pour vérifier que l'utilisateur est admin, super_admin ou agent
 */
function requireStaff(req, res, next) {
  if (!['admin', 'super_admin', 'agent_communal'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Accès refusé. Droits personnel requis.' 
    });
  }
  next();
}

/**
 * Middleware pour logger les actions (audit trail)
 */
function logAction(action, resourceType) {
  return async (req, res, next) => {
    // Continuer l'exécution, logger après
    const originalSend = res.json.bind(res);
    
    res.json = function(data) {
      // Logger l'action après la réponse
      auditService.log({
        user_id: req.user.id,
        action: action,
        resource_type: resourceType,
        resource_id: req.params.id || req.body.id || null,
        details: {
          method: req.method,
          path: req.path,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : {},
          params: req.params,
          query: req.query,
          status_code: res.statusCode,
        },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        zone_id: req.user.zone_id || null,
      }).catch(err => {
        console.error('Erreur lors de l\'enregistrement de l\'audit:', err);
      });
      
      return originalSend(data);
    };
    
    next();
  };
}

/**
 * Nettoie le body pour éviter de logger les mots de passe
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

module.exports = {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireZoneAccess,
  requireSuperAdmin,
  requireAdmin,
  requireStaff,
  logAction,
};

