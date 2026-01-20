require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const admin = require("firebase-admin");
const path = require("path");

// Chemin vers le fichier de compte de service Firebase
const serviceAccountPath = path.resolve(
  __dirname,
  "../../firebase-service-account.json"
);

let firebaseAdmin;

try {
  // Vérifier si le fichier existe
  const fs = require("fs");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
    // Initialiser Firebase Admin
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log("✅ Firebase Admin initialisé avec succès");
    console.log(`   Project ID: ${serviceAccount.project_id}`);
  } else {
    console.warn("⚠️  Fichier firebase-service-account.json non trouvé");
    console.warn("   La synchronisation Firebase sera désactivée");
    console.warn(`   Chemin attendu: ${serviceAccountPath}`);
  }
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Firebase Admin:", error.message);
  console.warn("   La synchronisation Firebase sera désactivée");
}

module.exports = firebaseAdmin;

