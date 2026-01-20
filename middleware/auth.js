const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { requireSuperAdmin, requireAdmin, requireStaff } = require('./permissions');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_in_production');
    const user = await userService.findById(decoded.userId);

    if (!user || !user.actif) {
      return res.status(401).json({ message: 'Utilisateur non autorisé.' });
    }

    // Retirer le mot de passe de l'objet user
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};

// Ancien middleware pour rétrocompatibilité (admin ou modérateur = admin maintenant)
const adminOnly = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    // Vérifier aussi l'ancien rôle 'moderateur' pour rétrocompatibilité
    if (req.user.role === 'moderateur') {
      // Traiter comme admin pour rétrocompatibilité
      return next();
    }
    return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
  }
  next();
};

module.exports = { 
  auth, 
  adminOnly,
  requireSuperAdmin,
  requireAdmin,
  requireStaff
};

