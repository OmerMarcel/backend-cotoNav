const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
const corsOriginsRaw = process.env.CORS_ORIGINS || "";
const allowedOrigins = corsOriginsRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// En prod, on force une whitelist. En dev, si rien n'est configuré, on autorise tout.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman / curl / SSR

      // Autoriser toutes les URLs Vercel (production + previews)
      if (
        origin &&
        (origin.includes(".vercel.app") || origin.includes("localhost:3000"))
      ) {
        return cb(null, true);
      }

      // Vérifier la whitelist configurée
      if (!allowedOrigins.length && process.env.NODE_ENV !== "production") {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ✅ Augmentation des limites AVANT les routes
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Test de connexion Supabase
try {
  const supabase = require("./config/supabase");
  console.log("✅ Configuration Supabase chargée");
} catch (error) {
  console.error("❌ Erreur de configuration Supabase:", error.message);
}

// Endpoint de santé pour tester la connexion
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Serveur opérationnel",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/infrastructures", require("./routes/infrastructures"));
app.use("/api/propositions", require("./routes/propositions"));
app.use("/api/contributions", require("./routes/propositions")); // Alias pour compatibilité mobile
app.use("/api/signalements", require("./routes/signalements"));
app.use("/api/users", require("./routes/users"));
app.use("/api/statistics", require("./routes/statistics"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/favorites", require("./routes/favorites"));
app.use("/api/roles", require("./routes/roles")); // Gestion des rôles (admins, agents)
app.use("/api/zones", require("./routes/zones")); // Gestion des zones géographiques
app.use("/api/audit", require("./routes/audit")); // Logs d'audit
app.use("/api/profile", require("./routes/profile")); // Profils utilisateurs
app.use("/api/notifications", require("./routes/notifications")); // Push web (FCM)
app.use("/api/avis", require("./routes/avis")); // Avis et commentaires
app.use("/api/rewards", require("./routes/rewards")); // Système de récompense
app.use("/api/wallet", require("./routes/wallet")); // Gestion des portefeuilles
app.use(
  "/api/administrative-location",
  require("./routes/administrative-location"),
); // Localisation administrative

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

// Gestion des erreurs de port déjà utilisé
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Erreur: Le port ${PORT} est déjà utilisé.`);
    console.error(`💡 Solutions:`);
    console.error(
      `   1. Arrêter le processus qui utilise le port: netstat -ano | findstr :${PORT}`,
    );
    console.error(`   2. Changer le port dans le fichier .env: PORT=5001`);
    console.error(`   3. Tuer le processus: taskkill /PID <PID> /F`);
    process.exit(1);
  } else {
    console.error("❌ Erreur serveur:", error);
    process.exit(1);
  }
});
