const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Supabase PostgreSQL connection details
const client = new Client({
  host: "phcwxylbnfajzvucnvuh.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.DB_PASSWORD || "your_supabase_password_here", // À remplacer
  ssl: { rejectUnauthorized: false },
});

async function executeSQLFile() {
  try {
    console.log("🔄 Connexion à PostgreSQL Supabase...\n");

    await client.connect();
    console.log("✅ Connexion réussie\n");

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, "..", "fixCotonou.sql");
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`Fichier SQL non trouvé: ${sqlFile}`);
    }

    const sqlContent = fs.readFileSync(sqlFile, "utf-8");
    console.log("📄 Fichier SQL chargé\n");

    // Afficher l'aperçu
    const lines = sqlContent.split("\n").slice(0, 10).join("\n");
    console.log("📋 Aperçu du script:");
    console.log(lines);
    console.log("...\n");

    // Exécuter le SQL
    console.log("⚙️  Exécution du script SQL...\n");

    // Split by GO or execute as one block
    const statements = sqlContent
      .split(";")
      .filter((stmt) => stmt.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt.length > 0) {
        console.log(
          `📌 Exécution de l'instruction ${i + 1}/${statements.length}...`,
        );

        try {
          const result = await client.query(stmt + ";");

          if (result.rows.length > 0) {
            console.log(`   ✅ Résultat:`, result.rows);
          } else {
            console.log(`   ✅ Exécutée (${result.rowCount} lignes affectées)`);
          }
        } catch (err) {
          if (
            !err.message.includes("already exists") &&
            !err.message.includes("does not exist")
          ) {
            console.error(`   ❌ Erreur:`, err.message);
          } else {
            console.log(`   ⚠️  ${err.message}`);
          }
        }
      }
    }

    console.log("\n✅ Script SQL exécuté avec succès!\n");

    // Vérifier les résultats
    console.log("🔍 Vérification des arrondissements de Cotonou...");
    const result = await client.query(`
      SELECT COUNT(*) FROM arrondissements ar
      JOIN communes c ON ar.commune_id = c.id
      WHERE c.nom ILIKE '%cotonou%'
    `);

    console.log(
      `✅ Nombre d'arrondissements de Cotonou: ${result.rows[0].count}\n`,
    );

    console.log("=".repeat(60));
    console.log("🎉 Correction terminée avec succès !");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Vérifier le mot de passe
if (
  !process.env.DB_PASSWORD ||
  process.env.DB_PASSWORD === "your_supabase_password_here"
) {
  console.log("⚠️  Variable DB_PASSWORD non définie");
  console.log("\n📝 Utilisation :");
  console.log(
    '   Linux/Mac: export DB_PASSWORD="votre_mot_de_passe" && node fixCotoneauDirect.js',
  );
  console.log(
    '   Windows: $env:DB_PASSWORD="votre_mot_de_passe"; node fixCotoneauDirect.js\n',
  );
  console.log("💡 Pour trouver votre mot de passe Supabase :");
  console.log(
    "   1. Allez à https://app.supabase.com/project/phcwxylbnfajzvucnvuh/settings/database",
  );
  console.log('   2. Cherchez "Connecting string" ou "Database credentials"');
  console.log("   3. Copiez le mot de passe PostgreSQL\n");
  process.exit(1);
}

executeSQLFile();
