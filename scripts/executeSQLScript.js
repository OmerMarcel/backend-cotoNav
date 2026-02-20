const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Supabase PostgreSQL connection string
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9@phcwxylbnfajzvucnvuh.supabase.co:5432/postgres?schema=public";

// Simulated password - normally from environment
// Note: Better to use .env file or connection string without password in CLI

async function executeSQLScript() {
  try {
    console.log("🔄 Tentative d'exécution du script SQL...\n");

    const sqlFile = path.join(__dirname, "..", "fixCotonou.sql");

    if (!fs.existsSync(sqlFile)) {
      throw new Error(`Fichier SQL non trouvé: ${sqlFile}`);
    }

    console.log("📄 Fichier SQL trouvé:", sqlFile);
    console.log("📋 Contenu du script:\n");

    const sqlContent = fs.readFileSync(sqlFile, "utf-8");
    console.log(sqlContent);
    console.log("\n" + "=".repeat(60));

    // Option 1: Try with psql if available
    console.log("\n🔍 Vérification de psql...");
    const psqlPath = process.platform === "win32" ? "psql" : "psql";

    exec("where psql", (error, stdout, stderr) => {
      if (error) {
        console.log(
          "⚠️  psql non found. Utilisez l'une des alternatives ci-dessous:\n",
        );
        displayAlternatives();
      } else {
        console.log("✅ psql trouvé. Prêt à exécuter.\n");
        displayInstructions();
      }
    });
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

function displayInstructions() {
  console.log("💡 Pour exécuter le script:\n");
  console.log("1️⃣  Via psql (si installé):");
  console.log("   psql --host=phcwxylbnfajzvucnvuh.supabase.co \\");
  console.log("        --port=5432 \\");
  console.log("        --username=postgres \\");
  console.log("        --dbname=postgres \\");
  console.log("        -f fixCotonou.sql\n");

  console.log("2️⃣  Via Supabase CLI:");
  console.log("   supabase db push --file fixCotonou.sql\n");

  console.log("3️⃣  Via Supabase Dashboard:");
  console.log(
    "   1. Visitez: https://app.supabase.com/project/phcwxylbnfajzvucnvuh/sql/templates",
  );
  console.log("   2. Créez une nouvelle Query");
  console.log("   3. Copiez-collez le contenu de fixCotonou.sql");
  console.log('   4. Cliquez sur "Run"\n');
}

function displayAlternatives() {
  console.log("📋 Alternatives pour exécuter le script:\n");
  console.log("Option 1: Supabase Dashboard Web UI");
  console.log(
    "   • URL: https://app.supabase.com/project/phcwxylbnfajzvucnvuh/sql",
  );
  console.log("   • Créez une nouvelle Query");
  console.log("   • Copiez le contenu de fixCotonou.sql\n");

  console.log("Option 2: Installer Supabase CLI");
  console.log("   npm install -g supabase");
  console.log("   supabase sql execute --file fixCotonou.sql\n");

  console.log("Option 3: Installer PostgreSQL Client (psql)");
  console.log("   Windows: https://www.postgresql.org/download/windows/");
  console.log("   macOS: brew install postgresql");
  console.log("   Linux: sudo apt install postgresql-client\n");

  console.log("📁 Le fichier fixCotonou.sql se trovue à:");
  console.log("   " + path.join(__dirname, "..", "fixCotonou.sql") + "\n");
}

executeSQLScript();
