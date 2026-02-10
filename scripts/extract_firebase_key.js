const fs = require('fs');
const path = require('path');

console.log('🔑 Extraction de la clé Firebase depuis le fichier JSON...\n');

// Chemin vers le fichier de compte de service
const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Fichier firebase-service-account.json non trouvé!');
  console.log('\n📋 Étapes pour obtenir la clé:');
  console.log('1. Allez dans https://console.firebase.google.com/');
  console.log('2. Sélectionnez le projet "geoloc-cotonou"');
  console.log('3. Allez dans Paramètres du projet → Comptes de service');
  console.log('4. Cliquez sur "Générer une nouvelle clé privée"');
  console.log('5. Téléchargez le fichier et placez-le à la racine du projet');
  console.log('6. Renommez-le en "firebase-service-account.json"');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  console.log('✅ Fichier Firebase trouvé et analysé');
  console.log(`📧 Email: ${serviceAccount.client_email}`);
  console.log(`🆔 Project ID: ${serviceAccount.project_id}`);
  
  // Extraire la clé privée et la formater correctement
  const privateKey = serviceAccount.private_key;
  
  console.log('\n🔑 Clé privée extraite (formatée pour .env):');
  console.log('--------------------------------------------------');
  console.log(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
  console.log(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
  console.log(`FIREBASE_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
  console.log('--------------------------------------------------');
  
  console.log('\n💡 Copiez ces lignes dans votre fichier .env pour remplacer les placeholders');
  
  // Vérifier si la clé est valide
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    console.error('❌ La clé privée semble invalide!');
  } else {
    console.log('✅ La clé privée semble valide');
  }
  
} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier Firebase:', error.message);
}
