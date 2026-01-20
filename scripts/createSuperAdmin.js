const dotenv = require('dotenv');
const path = require('path');

// Charger le .env depuis la racine du projet
dotenv.config({ path: path.join(__dirname, '../../.env') });

const userService = require('../services/userService');

async function createSuperAdmin() {
  try {
    const email = process.argv[2] || 'superadmin@example.com';
    const password = process.argv[3] || 'superadmin123';
    const nom = process.argv[4] || 'Super';
    const prenom = process.argv[5] || 'Admin';

    console.log('🔧 Création d\'un Super Admin...');
    console.log(`   Email: ${email}`);
    console.log(`   Nom: ${nom} ${prenom}`);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      console.log('⚠️  Un utilisateur avec cet email existe déjà.');
      console.log(`   Rôle actuel: ${existingUser.role}`);
      
      // Demander confirmation pour mettre à jour
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve) => {
        rl.question('Voulez-vous promouvoir cet utilisateur en Super Admin? (o/n): ', async (answer) => {
          if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'y') {
            try {
              const updatedUser = await userService.update(existingUser.id, { 
                role: 'super_admin',
                actif: true 
              });
              console.log('✅ Utilisateur promu en Super Admin avec succès!');
              console.log(`   Email: ${updatedUser.email}`);
              console.log(`   Rôle: ${updatedUser.role}`);
            } catch (error) {
              console.error('❌ Erreur lors de la promotion:', error);
            }
          } else {
            console.log('❌ Opération annulée.');
          }
          rl.close();
          resolve();
        });
      });
    }

    // Créer le Super Admin
    const superAdmin = await userService.create({
      nom,
      prenom,
      email,
      password,
      role: 'super_admin',
      actif: true
    });

    console.log('✅ Super Admin créé avec succès!');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Rôle: super_admin`);
    console.log(`   ID: ${superAdmin.id}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Changez le mot de passe après la première connexion!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createSuperAdmin();

