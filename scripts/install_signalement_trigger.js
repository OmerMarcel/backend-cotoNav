/**
 * Script : Installation du trigger de récompenses pour les signalements
 *
 * Ce script installe le trigger SQL qui attribue automatiquement des points
 * quand un signalement passe au statut "resolu".
 */

require("dotenv").config();
const supabase = require("../config/supabase");

async function installSignalementTrigger() {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🔧 INSTALLATION DU TRIGGER SIGNALEMENT → RÉCOMPENSES");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📝 Exécution du script SQL...\n");

    // Créer la fonction trigger
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION trigger_signalement_contribution()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.statut = 'resolu' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
            PERFORM record_contribution(
              NEW.signale_par,
              'signalement',
              NEW.id,
              jsonb_build_object('type', NEW.type)
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `;

    const { error: funcError } = await supabase.rpc("exec_sql", {
      sql: createFunctionSQL,
    });

    if (funcError) {
      // Si la fonction RPC n'existe pas, on essaie via une requête normale
      console.log(
        "⚠️  Impossible d'exécuter via RPC, tentative alternative...",
      );
      console.log("");
      console.log("📋 Copiez et exécutez ce SQL dans Supabase SQL Editor :");
      console.log("");
      console.log("─".repeat(60));
      console.log(createFunctionSQL);

      const createTriggerSQL = `
DROP TRIGGER IF EXISTS signalement_contribution_trigger ON signalements;
CREATE TRIGGER signalement_contribution_trigger
  AFTER UPDATE OF statut ON signalements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_signalement_contribution();
      `;

      console.log(createTriggerSQL);
      console.log("─".repeat(60));
      console.log("");
      console.log(
        "📍 Emplacement : https://supabase.com/dashboard/project/YOUR_PROJECT/sql",
      );
      console.log("");
      console.log("💡 Après l'exécution, testez avec :");
      console.log("   node scripts/test_signalement_rewards.js");
      return;
    }

    console.log("✅ Fonction trigger_signalement_contribution() créée");

    // Supprimer l'ancien trigger s'il existe
    const dropTriggerSQL = `
      DROP TRIGGER IF EXISTS signalement_contribution_trigger ON signalements;
    `;

    const { error: dropError } = await supabase.rpc("exec_sql", {
      sql: dropTriggerSQL,
    });
    if (!dropError) {
      console.log("✅ Ancien trigger supprimé (si existait)");
    }

    // Créer le nouveau trigger
    const createTriggerSQL = `
      CREATE TRIGGER signalement_contribution_trigger
          AFTER UPDATE OF statut ON signalements
          FOR EACH ROW
          EXECUTE FUNCTION trigger_signalement_contribution();
    `;

    const { error: triggerError } = await supabase.rpc("exec_sql", {
      sql: createTriggerSQL,
    });

    if (triggerError) {
      console.error(
        "❌ Erreur lors de la création du trigger:",
        triggerError.message,
      );
      return;
    }

    console.log("✅ Trigger signalement_contribution_trigger créé");
    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ INSTALLATION RÉUSSIE !");
    console.log("═══════════════════════════════════════════════════════");
    console.log("");
    console.log(
      "🎁 Les utilisateurs gagnent maintenant des points automatiquement",
    );
    console.log("   quand un signalement est resolu !");
    console.log("");
    console.log("🧪 Testez le système avec :");
    console.log("   node scripts/test_signalement_rewards.js");
  } catch (error) {
    console.error("❌ Erreur inattendue:", error.message);
    console.error("Stack:", error.stack);
    console.log("");
    console.log("💡 SOLUTION ALTERNATIVE :");
    console.log("   Exécutez le script SQL complet de migration :");
    console.log("   node scripts/run_migration.js");
  }
}

installSignalementTrigger()
  .then(() => {
    console.log("");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });
