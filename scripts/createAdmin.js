const dotenv = require('dotenv');
const path = require('path');

// Charger le .env depuis la racine du projet
dotenv.config({ path: path.join(__dirname, '../../.env') });

const userService = require('../services/userService');

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const nom = process.argv[4] || 'Admin';
    const prenom = process.argv[5] || 'System';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      console.log('❌ Un utilisateur avec cet email existe déjà.');
      process.exit(1);
    }

    // Créer l'admin
    const admin = await userService.create({
      nom,
      prenom,
      email,
      password,
      role: 'admin',
      actif: true
    });

    console.log('✅ Administrateur créé avec succès!');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Rôle: admin`);
    console.log(`   ID: ${admin.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createAdmin();

