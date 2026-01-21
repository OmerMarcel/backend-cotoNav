require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const admin = require("firebase-admin");
const path = require("path");

let firebaseAdmin;

try {
  // Méthode 1 : Essayer de charger depuis les variables d'environnement (pour Render/Vercel)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Nettoyer la clé privée (remplacer \n littéraux par de vraies lignes)
    const cleanedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    const serviceAccount = {
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: cleanedPrivateKey,
    };
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });
    
    console.log("✅ Firebase Admin initialisé avec succès (variables d'environnement)");
    console.log(`   Project ID: ${projectId}`);
  } else {
    // Méthode 2 : Essayer de charger depuis le fichier JSON (pour développement local)
    const serviceAccountPath = path.resolve(
      __dirname,
      "../../firebase-service-account.json"
    );
    
    const fs = require("fs");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      
      console.log("✅ Firebase Admin initialisé avec succès (fichier JSON)");
      console.log(`   Project ID: ${serviceAccount.project_id}`);
    } else {
      console.warn("⚠️  Firebase Admin non configuré");
      console.warn("   Options:");
      console.warn("   1. Variables d'environnement: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
      console.warn("   2. Fichier: firebase-service-account.json");
      console.warn("   La synchronisation Firebase sera désactivée");
    }
  }
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Firebase Admin:", error.message);
  console.warn("   La synchronisation Firebase sera désactivée");
}

module.exports = firebaseAdmin;

