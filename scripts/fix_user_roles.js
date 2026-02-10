const supabase = require('../config/supabase');

async function fixUserRoles() {
  try {
    console.log('🔧 Correction des rôles des utilisateurs...\n');

    // Récupérer tous les utilisateurs sans rôle ou avec un rôle incorrect
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, nom, prenom')
      .eq('actif', true)
      .or('role.is.null,role.eq.,role.neq.citoyen,role.neq.admin,role.neq.agent_communal,role.neq.super_admin');

    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError);
      return;
    }

    console.log(`📋 Utilisateurs avec rôle incorrect ou manquant: ${users?.length || 0}\n`);

    if (users && users.length > 0) {
      // Mettre à jour tous les utilisateurs avec le rôle "citoyen" par défaut
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'citoyen' })
        .in('id', users.map(u => u.id));

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour des rôles:', updateError);
        return;
      }

      console.log('✅ Utilisateurs mis à jour avec le rôle "citoyen":');
      users.forEach(user => {
        console.log(`   - ${user.prenom} ${user.nom} (${user.email})`);
      });
    } else {
      console.log('✅ Tous les utilisateurs ont déjà un rôle valide');
    }

    // Mettre à jour les tokens FCM existants avec le bon rôle
    const { data: tokens, error: tokensError } = await supabase
      .from('user_fcm_tokens')
      .select(`
        *,
        users:user_id (
          role
        )
      `);

    if (tokensError) {
      console.error('❌ Erreur lors de la récupération des tokens:', tokensError);
      return;
    }

    console.log(`\n🔧 Mise à jour des tokens FCM avec les bons rôles...`);

    const tokensToUpdate = tokens?.filter(token => 
      token.users?.role && token.role !== token.users.role
    ) || [];

    if (tokensToUpdate.length > 0) {
      for (const token of tokensToUpdate) {
        const { error: updateTokenError } = await supabase
          .from('user_fcm_tokens')
          .update({ role: token.users.role })
          .eq('id', token.id);

        if (updateTokenError) {
          console.error(`❌ Erreur mise à jour token ${token.id}:`, updateTokenError);
        } else {
          console.log(`✅ Token mis à jour: ${token.platform} - ${token.users.role}`);
        }
      }
    } else {
      console.log('✅ Tous les tokens FCM ont déjà le bon rôle');
    }

    // Afficher le résumé final
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('role')
      .eq('actif', true);

    if (!finalError && finalUsers) {
      const roles = {};
      finalUsers.forEach(user => {
        roles[user.role] = (roles[user.role] || 0) + 1;
      });

      console.log('\n📊 Répartition finale des rôles:');
      Object.entries(roles).forEach(([role, count]) => {
        console.log(`   ${role}: ${count} utilisateur(s)`);
      });
    }

    console.log('\n✅ Correction terminée!');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
fixUserRoles();
