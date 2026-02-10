const express = require('express');
const router = express.Router();
const FirebaseAuthService = require('../services/firebaseAuth');
const { authenticateToken } = require('../middleware/auth');

// Route pour vérifier un token Firebase
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decodedToken = await FirebaseAuthService.verifyToken(token);
    
    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        customClaims: decodedToken.customClaims || {}
      }
    });
  } catch (error) {
    console.error('Erreur vérification token:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
});

// Route pour créer un utilisateur (admin seulement)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants'
      });
    }

    const userRecord = await FirebaseAuthService.createUser(email, password, displayName);
    
    res.json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création de l\'utilisateur'
    });
  }
});

// Route pour mettre à jour un utilisateur
router.put('/update/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    // Ne pas permettre la modification de l'email ou du mot de passe via cette route
    delete updates.email;
    delete updates.password;
    
    const userRecord = await FirebaseAuthService.updateUser(uid, updates);
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: userRecord
    });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
});

// Route pour supprimer un utilisateur
router.delete('/delete/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    await FirebaseAuthService.deleteUser(uid);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
});

// Route pour obtenir un utilisateur par UID
router.get('/user/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    const userRecord = await FirebaseAuthService.getUser(uid);
    
    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        customClaims: userRecord.customClaims
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(404).json({
      success: false,
      message: 'Utilisateur non trouvé'
    });
  }
});

// Route pour lister les utilisateurs
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { nextPageToken } = req.query;
    
    const listUsersResult = await FirebaseAuthService.listUsers(nextPageToken);
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      customClaims: user.customClaims
    }));
    
    res.json({
      success: true,
      users,
      nextPageToken: listUsersResult.pageToken
    });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// Route pour réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email manquant'
      });
    }

    const resetLink = await FirebaseAuthService.resetPassword(email);
    
    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé',
      resetLink // En développement uniquement
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
});

// Route pour envoyer un email de vérification
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email manquant'
      });
    }

    const verificationLink = await FirebaseAuthService.generateEmailVerificationLink(email);
    
    res.json({
      success: true,
      message: 'Email de vérification envoyé',
      verificationLink // En développement uniquement
    });
  } catch (error) {
    console.error('Erreur envoi email vérification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'envoi de l\'email de vérification'
    });
  }
});

// Route pour définir les claims personnalisés
router.post('/set-claims/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { claims } = req.body;
    
    if (!claims || typeof claims !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Claims invalides'
      });
    }

    await FirebaseAuthService.setCustomUserClaims(uid, claims);
    
    res.json({
      success: true,
      message: 'Claims définis avec succès'
    });
  } catch (error) {
    console.error('Erreur définition claims:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la définition des claims'
    });
  }
});

module.exports = router;
