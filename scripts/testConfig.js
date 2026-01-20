const supabase = require("../config/supabase");
const fs = require("fs");
const path = require("path");

console.log("\n" + "=".repeat(60));
console.log("🔍 TEST DE CONFIGURATION AVANT MIGRATION");
console.log("=".repeat(60) + "\n");

let allTestsPassed = true;
const errors = [];
const warnings = [];

// Test 1: Variables d'environnement
console.log("📋 Test 1 : Variables d'environnement");
console.log("─".repeat(60));

if (process.env.SUPABASE_URL) {
  console.log("✅ SUPABASE_URL définie :", process.env.SUPABASE_URL);
} else {
  console.log("❌ SUPABASE_URL non définie");
  errors.push("SUPABASE_URL manquante dans le fichier .env");
  allTestsPassed = false;
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(
    "✅ SUPABASE_SERVICE_ROLE_KEY définie :",
    key.substring(0, 20) + "..."
  );

  if (key.includes("anon")) {
    console.log(
      "⚠️  ATTENTION : Vous utilisez peut-être l'anon key au lieu de la service_role key"
    );
    warnings.push(
      "Vérifiez que vous utilisez la Service Role Key et non l'anon key"
    );
  }
} else {
  console.log("❌ SUPABASE_SERVICE_ROLE_KEY non définie");
  errors.push("SUPABASE_SERVICE_ROLE_KEY manquante dans le fichier .env");
  allTestsPassed = false;
}

if (process.env.JWT_SECRET) {
  console.log("✅ JWT_SECRET défini");
  if (process.env.JWT_SECRET.length < 32) {
    console.log("⚠️  JWT_SECRET est court, utilisez une clé plus longue");
    warnings.push("JWT_SECRET devrait faire au moins 32 caractères");
  }
} else {
  console.log("⚠️  JWT_SECRET non défini (non critique pour l'import)");
  warnings.push("JWT_SECRET absent, nécessaire pour l'authentification");
}

console.log("");

// Test 2: Connexion Supabase
console.log("📋 Test 2 : Connexion à Supabase");
console.log("─".repeat(60));

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      throw error;
    }

    console.log("✅ Connexion Supabase réussie");
    return true;
  } catch (error) {
    console.log("❌ Erreur de connexion Supabase :", error.message);
    errors.push("Impossible de se connecter à Supabase : " + error.message);
    return false;
  }
}

// Test 3: Schéma de base de données
async function testDatabaseSchema() {
  console.log("\n📋 Test 3 : Schéma de base de données");
  console.log("─".repeat(60));

  try {
    // Vérifier que la table infrastructures existe
    const { data, error } = await supabase
      .from("infrastructures")
      .select("count")
      .limit(1);

    if (error) {
      if (error.message.includes("does not exist")) {
        console.log('❌ Table "infrastructures" n\'existe pas');
        errors.push(
          "Exécutez le schéma SQL dans Supabase (server/database/schema.sql)"
        );
        return false;
      }
      throw error;
    }

    console.log('✅ Table "infrastructures" existe');

    // Compter les infrastructures existantes
    const { count } = await supabase
      .from("infrastructures")
      .select("*", { count: "exact", head: true });

    console.log(`ℹ️  Infrastructures actuelles dans la base : ${count || 0}`);

    if (count > 0) {
      warnings.push(
        `${count} infrastructure(s) déjà présente(s). L'import ajoutera de nouvelles entrées.`
      );
    }

    return true;
  } catch (error) {
    console.log("❌ Erreur lors de la vérification du schéma :", error.message);
    errors.push("Erreur schéma : " + error.message);
    return false;
  }
}

// Test 4: Fichier JSON source
console.log("\n📋 Test 4 : Fichier JSON source");
console.log("─".repeat(60));

const jsonPath = path.join(
  __dirname,
  "../../../localisation/assets/data/sample_infrastructures.json"
);
console.log("Chemin recherché :", jsonPath);

if (fs.existsSync(jsonPath)) {
  console.log("✅ Fichier JSON trouvé");

  try {
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(rawData);

    if (Array.isArray(data)) {
      console.log(`✅ JSON valide avec ${data.length} infrastructure(s)`);

      // Vérifier quelques champs essentiels
      const firstItem = data[0];
      if (firstItem) {
        const hasRequiredFields =
          firstItem.name && firstItem.latitude && firstItem.longitude;

        if (hasRequiredFields) {
          console.log("✅ Structure des données valide");
        } else {
          console.log("⚠️  Structure des données incomplète");
          warnings.push("Certains champs requis peuvent manquer dans le JSON");
        }
      }
    } else {
      console.log("❌ Le JSON n'est pas un tableau");
      errors.push("Le fichier JSON doit contenir un tableau d'infrastructures");
      allTestsPassed = false;
    }
  } catch (error) {
    console.log("❌ Erreur lors de la lecture du JSON :", error.message);
    errors.push("JSON invalide : " + error.message);
    allTestsPassed = false;
  }
} else {
  console.log("❌ Fichier JSON introuvable");
  console.log("💡 Vérifiez le chemin dans server/scripts/importSampleData.js");
  errors.push("Fichier JSON source introuvable");
  allTestsPassed = false;
}

// Exécuter les tests asynchrones
(async () => {
  const supabaseOk = await testSupabaseConnection();

  if (supabaseOk) {
    await testDatabaseSchema();
  }

  // Résumé final
  console.log("\n" + "=".repeat(60));
  console.log("📊 RÉSUMÉ DES TESTS");
  console.log("=".repeat(60));

  if (allTestsPassed && errors.length === 0) {
    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS !");
    console.log("\n✅ Vous pouvez lancer la migration :");
    console.log("   npm run import-sample-data\n");
  } else {
    console.log("\n❌ DES ERREURS ONT ÉTÉ DÉTECTÉES\n");

    if (errors.length > 0) {
      console.log("🔴 ERREURS À CORRIGER :");
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
      console.log("");
    }
  }

  if (warnings.length > 0) {
    console.log("⚠️  AVERTISSEMENTS :");
    warnings.forEach((warn, i) => {
      console.log(`   ${i + 1}. ${warn}`);
    });
    console.log("");
  }

  // Aide
  console.log("📖 DOCUMENTATION :");
  console.log("   • Configuration : CONFIG_ENV.md");
  console.log("   • Migration : EXECUTER_MIGRATION.md");
  console.log("   • Dépannage : RESOLUTION_ERREURS_SUPABASE.md");
  console.log("");

  console.log("=".repeat(60) + "\n");

  process.exit(errors.length > 0 ? 1 : 0);
})();
