const admin = require('firebase-admin');
const serviceAccount = require('../../firebase-service-account.json');

// Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const auth = admin.auth();

class FirebaseAuthService {
  // Vérifier un token Firebase
  static async verifyToken(token) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Erreur vérification token:', error);
      throw new Error('Token invalide');
    }
  }

  // Créer un utilisateur avec email et mot de passe
  static async createUser(email, password, displayName) {
    try {
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: false
      });

      // Envoyer un email de vérification
      await auth.generateEmailVerificationLink(email);

      return userRecord;
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      throw error;
    }
  }

  // Mettre à jour un utilisateur
  static async updateUser(uid, updates) {
    try {
      const userRecord = await auth.updateUser(uid, updates);
      return userRecord;
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      throw error;
    }
  }

  // Supprimer un utilisateur
  static async deleteUser(uid) {
    try {
      await auth.deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      throw error;
    }
  }

  // Obtenir un utilisateur par UID
  static async getUser(uid) {
    try {
      const userRecord = await auth.getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      throw error;
    }
  }

  // Obtenir un utilisateur par email
  static async getUserByEmail(email) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      return userRecord;
    } catch (error) {
      console.error('Erreur récupération utilisateur par email:', error);
      throw error;
    }
  }

  // Lister les utilisateurs
  static async listUsers(nextPageToken) {
    try {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      return listUsersResult;
    } catch (error) {
      console.error('Erreur liste utilisateurs:', error);
      throw error;
    }
  }

  // Réinitialiser le mot de passe
  static async resetPassword(email) {
    try {
      const link = await auth.generatePasswordResetLink(email);
      return link;
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      throw error;
    }
  }

  // Générer un lien de vérification email
  static async generateEmailVerificationLink(email) {
    try {
      const link = await auth.generateEmailVerificationLink(email);
      return link;
    } catch (error) {
      console.error('Erreur génération lien vérification:', error);
      throw error;
    }
  }

  // Révoquer un token d'actualisation
  static async revokeRefreshTokens(uid) {
    try {
      await auth.revokeRefreshTokens(uid);
      return true;
    } catch (error) {
      console.error('Erreur révocation tokens:', error);
      throw error;
    }
  }

  // Désactiver un utilisateur
  static async disableUser(uid) {
    try {
      await auth.updateUser(uid, { disabled: true });
      return true;
    } catch (error) {
      console.error('Erreur désactivation utilisateur:', error);
      throw error;
    }
  }

  // Activer un utilisateur
  static async enableUser(uid) {
    try {
      await auth.updateUser(uid, { disabled: false });
      return true;
    } catch (error) {
      console.error('Erreur activation utilisateur:', error);
      throw error;
    }
  }

  // Définir les claims personnalisés
  static async setCustomUserClaims(uid, claims) {
    try {
      await auth.setCustomUserClaims(uid, claims);
      return true;
    } catch (error) {
      console.error('Erreur définition claims:', error);
      throw error;
    }
  }

  // Obtenir les claims personnalisés
  static async getCustomUserClaims(uid) {
    try {
      const user = await auth.getUser(uid);
      return user.customClaims;
    } catch (error) {
      console.error('Erreur récupération claims:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAuthService;
