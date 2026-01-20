// Service pour gérer les codes de vérification
// Stockage en mémoire (pour la production, utilisez Redis ou une base de données)

class VerificationService {
  constructor() {
    // Stockage en mémoire : { email: { code, expiresAt, attempts } }
    this.verificationCodes = new Map();
    
    // Nettoyer les codes expirés toutes les 5 minutes
    setInterval(() => {
      this.cleanExpiredCodes();
    }, 5 * 60 * 1000);
  }

  /**
   * Génère un code de vérification à 6 chiffres
   */
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Crée et stocke un code de vérification pour un email
   * @param {string} email - L'email de l'utilisateur
   * @param {number} expirationMinutes - Durée de validité en minutes (défaut: 10)
   * @returns {string} Le code de vérification généré
   */
  createVerificationCode(email, expirationMinutes = 10) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    
    this.verificationCodes.set(email.toLowerCase(), {
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    console.log(`📝 Code de vérification créé pour ${email}: ${code} (expire dans ${expirationMinutes} min)`);
    
    return code;
  }

  /**
   * Vérifie un code de vérification
   * @param {string} email - L'email de l'utilisateur
   * @param {string} code - Le code à vérifier
   * @param {number} maxAttempts - Nombre maximum de tentatives (défaut: 5)
   * @returns {boolean} True si le code est valide, false sinon
   */
  verifyCode(email, code, maxAttempts = 5) {
    const emailLower = email.toLowerCase();
    const stored = this.verificationCodes.get(emailLower);

    if (!stored) {
      console.log(`❌ Aucun code de vérification trouvé pour ${email}`);
      return false;
    }

    // Vérifier si le code a expiré
    if (new Date() > stored.expiresAt) {
      console.log(`❌ Code de vérification expiré pour ${email}`);
      this.verificationCodes.delete(emailLower);
      return false;
    }

    // Vérifier le nombre de tentatives
    if (stored.attempts >= maxAttempts) {
      console.log(`❌ Trop de tentatives pour ${email}. Code supprimé.`);
      this.verificationCodes.delete(emailLower);
      return false;
    }

    // Vérifier le code
    if (stored.code === code) {
      console.log(`✅ Code de vérification valide pour ${email}`);
      // Supprimer le code après vérification réussie
      this.verificationCodes.delete(emailLower);
      return true;
    } else {
      // Incrémenter le compteur de tentatives
      stored.attempts++;
      console.log(`❌ Code incorrect pour ${email}. Tentative ${stored.attempts}/${maxAttempts}`);
      return false;
    }
  }

  /**
   * Vérifie si un code existe pour un email (sans le valider)
   * @param {string} email - L'email de l'utilisateur
   * @returns {boolean} True si un code existe et n'est pas expiré
   */
  hasValidCode(email) {
    const emailLower = email.toLowerCase();
    const stored = this.verificationCodes.get(emailLower);

    if (!stored) {
      return false;
    }

    if (new Date() > stored.expiresAt) {
      this.verificationCodes.delete(emailLower);
      return false;
    }

    return true;
  }

  /**
   * Supprime un code de vérification
   * @param {string} email - L'email de l'utilisateur
   */
  deleteCode(email) {
    this.verificationCodes.delete(email.toLowerCase());
  }

  /**
   * Nettoie les codes expirés
   */
  cleanExpiredCodes() {
    const now = new Date();
    let cleaned = 0;

    for (const [email, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        this.verificationCodes.delete(email);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} code(s) de vérification expiré(s) nettoyé(s)`);
    }
  }

  /**
   * Obtient les statistiques (pour le debug)
   */
  getStats() {
    return {
      totalCodes: this.verificationCodes.size,
      codes: Array.from(this.verificationCodes.entries()).map(([email, data]) => ({
        email,
        expiresAt: data.expiresAt,
        attempts: data.attempts,
        isExpired: new Date() > data.expiresAt,
      })),
    };
  }
}

module.exports = new VerificationService();

