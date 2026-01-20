require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.SUPABASE_URL || "https://yejligyctalvhrzesjrb.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  console.error(
    "❌ ERREUR: La variable d'environnement SUPABASE_URL est requise"
  );
  throw new Error("La variable d'environnement SUPABASE_URL est requise");
}

if (!supabaseKey) {
  console.error(
    "❌ ERREUR: La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise"
  );
  console.error(
    "💡 Solution: Créez un fichier .env à la racine du projet avec:"
  );
  console.error("   SUPABASE_URL=https://votre-projet.supabase.co");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key");
  throw new Error(
    "La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise. Veuillez utiliser la Service Role Key (pas l'anon key). Vous pouvez la trouver dans Supabase → Settings → API → Service Role Key"
  );
}

console.log("🔗 Configuration Supabase:");
console.log(`   URL: ${supabaseUrl}`);
console.log(
  `   Key: ${
    supabaseKey ? supabaseKey.substring(0, 20) + "..." : "NON DÉFINIE"
  }`
);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test de connexion
supabase
  .from("users")
  .select("count")
  .limit(1)
  .then(() => {
    console.log("✅ Connexion Supabase réussie");
  })
  .catch((error) => {
    console.error("❌ Erreur de connexion Supabase:", error.message);
    console.error("💡 Vérifiez:");
    console.error("   1. Que votre URL Supabase est correcte");
    console.error("   2. Que votre Service Role Key est valide");
    console.error("   3. Que vous avez une connexion Internet");
  });

module.exports = supabase;
