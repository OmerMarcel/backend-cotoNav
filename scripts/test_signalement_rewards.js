/**
 * Script de test : Vérifier que les récompenses de signalement fonctionnent
 *
 * Ce script :
 * 1. Vérifie si le trigger existe dans Supabase
 * 2. Teste la résolution d'un signalement et vérifie les points attribués
 */

require("dotenv").config();
const supabase = require("../config/supabase");

async function checkTriggerExists() {
  console.log(
    "🔍 Vérification de l'existence du trigger signalement_contribution_trigger...\n",
  );

  const { data, error } = await supabase.rpc("check_trigger_exists", {
    trigger_name: "signalement_contribution_trigger",
    table_name: "signalements",
  });

  if (error) {
    console.log(
      "⚠️  Impossible de vérifier le trigger (fonction RPC non disponible)",
    );
    console.log("   Continuons avec le test fonctionnel...\n");
    return null;
  }

  return data;
}

async function testSignalementRewards() {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎁 TEST DES RÉCOMPENSES POUR LES SIGNALEMENTS");
    console.log("═══════════════════════════════════════════════════════\n");

    // 1. Trouver un utilisateur de test
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, total_points, nom, prenom")
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error(
        "❌ Erreur : Aucun utilisateur trouvé dans la base de données",
      );
      return;
    }

    const testUser = users[0];
    console.log("👤 Utilisateur de test :", {
      id: testUser.id,
      email: testUser.email,
      nom: `${testUser.prenom} ${testUser.nom}`,
      points_avant: testUser.total_points,
    });

    // 2. Trouver une infrastructure
    const { data: infrastructures, error: infraError } = await supabase
      .from("infrastructures")
      .select("id, nom")
      .limit(1);

    if (infraError || !infrastructures || infrastructures.length === 0) {
      console.error("❌ Erreur : Aucune infrastructure trouvée");
      return;
    }

    const testInfra = infrastructures[0];
    console.log("🏢 Infrastructure de test :", testInfra.nom);
    console.log("");

    // 3. Créer un signalement de test
    console.log("📝 Création d'un signalement de test...");
    const { data: signalement, error: sigError } = await supabase
      .from("signalements")
      .insert({
        infrastructure_id: testInfra.id,
        signale_par: testUser.id,
        type: "equipement_degrade",
        description: "[TEST] Signalement de test pour vérifier les récompenses",
        statut: "nouveau",
      })
      .select()
      .single();

    if (sigError) {
      console.error(
        "❌ Erreur lors de la création du signalement:",
        sigError.message,
      );
      return;
    }

    console.log("✅ Signalement créé avec ID:", signalement.id);

    // 4. Passer le signalement en "resolu" pour déclencher la récompense
    console.log("✅ Passage du signalement au statut resolu...");
    const { error: resolveError } = await supabase
      .from("signalements")
      .update({
        statut: "resolu",
        traite_le: new Date().toISOString(),
      })
      .eq("id", signalement.id);

    if (resolveError) {
      console.error(
        "❌ Erreur lors de la mise a jour du statut:",
        resolveError.message,
      );
      return;
    }

    // 5. Attendre un peu pour que le trigger s'exécute
    console.log("⏳ Attente de l'exécution du trigger...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. Vérifier les points de l'utilisateur
    const { data: updatedUser, error: checkError } = await supabase
      .from("users")
      .select("total_points")
      .eq("id", testUser.id)
      .single();

    if (checkError) {
      console.error(
        "❌ Erreur lors de la vérification des points:",
        checkError.message,
      );
      return;
    }

    console.log("");
    console.log("📊 RÉSULTATS :");
    console.log("   Points avant  :", testUser.total_points);
    console.log("   Points après  :", updatedUser.total_points);
    console.log(
      "   Différence    :",
      updatedUser.total_points - testUser.total_points,
    );

    // 7. Vérifier la contribution dans reward_contributions
    const { data: contributions, error: contribError } = await supabase
      .from("reward_contributions")
      .select("*")
      .eq("user_id", testUser.id)
      .eq("contribution_type", "signalement")
      .eq("related_entity_id", signalement.id);

    if (contribError) {
      console.error(
        "⚠️  Erreur lors de la vérification des contributions:",
        contribError.message,
      );
    } else if (contributions && contributions.length > 0) {
      console.log("");
      console.log("✅ Contribution enregistrée dans reward_contributions :");
      console.log("   Type          :", contributions[0].contribution_type);
      console.log("   Points gagnés :", contributions[0].points_awarded);
      console.log(
        "   Date          :",
        new Date(contributions[0].contribution_date).toLocaleString("fr-FR"),
      );
    } else {
      console.log("");
      console.log("⚠️  Aucune contribution trouvée dans reward_contributions");
      console.log(
        "   Le trigger n'a peut-être pas été exécuté ou n'existe pas.",
      );
    }

    // 8. Nettoyer (supprimer le signalement de test)
    console.log("");
    console.log("🧹 Nettoyage du signalement de test...");
    const { error: deleteError } = await supabase
      .from("signalements")
      .delete()
      .eq("id", signalement.id);

    if (deleteError) {
      console.error("⚠️  Erreur lors du nettoyage:", deleteError.message);
      console.log(
        "   Vous pouvez supprimer manuellement le signalement ID:",
        signalement.id,
      );
    } else {
      console.log("✅ Signalement de test supprimé");
    }

    // 9. Conclusion
    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    if (
      updatedUser.total_points > testUser.total_points &&
      contributions &&
      contributions.length > 0
    ) {
      console.log(
        "✅ TEST RÉUSSI : Les récompenses de signalement fonctionnent !",
      );
      console.log(
        "   L'utilisateur a gagné",
        updatedUser.total_points - testUser.total_points,
        "points",
      );
    } else if (updatedUser.total_points > testUser.total_points) {
      console.log(
        "⚠️  TEST PARTIEL : Les points ont augmenté mais pas de trace dans reward_contributions",
      );
    } else {
      console.log("❌ TEST ÉCHOUÉ : Aucun point n'a été attribué");
      console.log("");
      console.log("💡 SOLUTION :");
      console.log("   Le trigger SQL n'est probablement pas installé.");
      console.log("   Exécutez la migration avec :");
      console.log("   node scripts/run_migration.js");
    }
    console.log("═══════════════════════════════════════════════════════");
  } catch (error) {
    console.error("❌ Erreur inattendue:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Exécuter le test
testSignalementRewards()
  .then(() => {
    console.log("");
    console.log("Test terminé.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });
