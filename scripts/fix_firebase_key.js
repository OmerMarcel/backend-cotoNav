const fs = require('fs');
const path = require('path');

console.log('🔧 Correction du format de la clé Firebase...\n');

// Lire le fichier JSON
const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Extraire et formater la clé privée correctement
const privateKey = serviceAccount.private_key;

console.log('📋 Configuration Firebase corrigée:');
console.log('=====================================');
console.log(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
console.log(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
console.log(`FIREBASE_PRIVATE_KEY="${privateKey}"`);
console.log('=====================================');

// Créer un nouveau .env avec la bonne clé
const envContent = `# Port du serveur
PORT=5000

# Base de données Supabase
SUPABASE_URL=https://yejligyctalvhrzesjrb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllamxpZ3ljdGFsdmhyemVzanJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQxMTkyNCwiZXhwIjoyMDc4OTg3OTI0fQ.uMU6BfOErap3ua0qWmm4VAaNfde6IQlj5XjOAP0O5KA

# JWT
JWT_SECRET=6af4d289-ECEC-4847-9f93-7ad35BD0440A

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=localisation18@gmail.com
SMTP_PASS=
EMAIL_FROM=localisation18@gmail.com

# API Keys
GEOCODING_API_KEY=votre_cle_api_openweathermap

# URLs
FRONTEND_URL=http://localhost:3000,http://localhost:8080,http://10.0.2.2:5000

# Environment
NODE_ENV=development

# Configuration Firebase
FIREBASE_API_KEY=AIzaSyDPAKyaXFXOQUDrCADfMAOS3yPSRDvuHGI
FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_PRIVATE_KEY="${privateKey}"
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_STORAGE_BUCKET=geoloc-cotonou.appspot.com
FIREBASE_AUTH_DOMAIN=geoloc-cotonou.firebaseapp.com

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
`;

// Écrire le nouveau .env
fs.writeFileSync(path.resolve(__dirname, '../../.env'), envContent);

console.log('✅ Fichier .env mis à jour avec la clé Firebase correcte');
console.log('\n🧪 Test de la configuration Firebase...');

// Tester la configuration
try {
  const firebaseAdmin = require('../config/firebase.js');
  if (firebaseAdmin) {
    console.log('✅ Firebase Admin initialisé avec succès!');
  } else {
    console.log('❌ Firebase Admin non initialisé');
  }
} catch (error) {
  console.log('❌ Erreur:', error.message);
}
