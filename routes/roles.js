const express = require("express");
const { body, validationResult } = require("express-validator");
const userService = require("../services/userService");
const zoneService = require("../services/zoneService");
const emailService = require("../services/emailService");
const { auth, requireSuperAdmin, requireAdmin } = require("../middleware/auth");
const { requirePermission, logAction } = require("../middleware/permissions");
const auditService = require("../services/auditService");

const router = express.Router();

/**
 * ROUTES SUPER ADMIN
 */

// Créer un administrateur (Super Admin uniquement)
router.post(
  "/admins",
  auth,
  requireSuperAdmin,
  logAction("CREATE_ADMIN", "user"),
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("nom").notEmpty().trim(),
    body("prenom").notEmpty().trim(),
    body("zone_id").optional().isUUID(),
    body("telephone").optional().isMobilePhone(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, nom, prenom, zone_id, telephone } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé." });
      }

      // Vérifier la zone si fournie
      if (zone_id) {
        const zone = await zoneService.findById(zone_id);
        if (!zone || !zone.actif) {
          return res.status(400).json({ message: "Zone invalide." });
        }
      }

      // Créer l'administrateur
      const admin = await userService.create({
        email,
        password,
        nom,
        prenom,
        telephone,
        role: "admin",
        zone_id: zone_id || null,
        actif: true,
        cree_par: req.user.id,
      });

      // Envoyer un email de bienvenue (optionnel)
      try {
        await emailService.sendWelcomeEmail(email, nom, "administrateur");
      } catch (emailError) {
        console.warn("Impossible d'envoyer l'email de bienvenue:", emailError);
      }

      // Logger l'action
      await auditService.log({
        user_id: req.user.id,
        action: "CREATE_ADMIN",
        resource_type: "user",
        resource_id: admin.id,
        details: {
          admin_email: email,
          zone_id: zone_id || null,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
      });

      const { password: _, ...adminWithoutPassword } = admin;
      res.status(201).json({
        message: "Administrateur créé avec succès.",
        admin: adminWithoutPassword,
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'administrateur:", error);
      res.status(500).json({
        message: "Erreur serveur lors de la création de l'administrateur.",
      });
    }
  },
);

// Créer un agent communal (Super Admin ou Admin de zone)
router.post(
  "/agents",
  auth,
  requirePermission("manage_agents"),
  logAction("CREATE_AGENT", "user"),
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("nom").notEmpty().trim(),
    body("prenom").notEmpty().trim(),
    body("zone_id").optional().isUUID(),
    body("zone_nom").optional().trim().notEmpty(),
    body("telephone").optional().isMobilePhone(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, nom, prenom, zone_id, zone_nom, telephone } =
        req.body;

      // Déterminer la zone : Admin et Super Admin peuvent choisir ou laisser vide
      let finalZoneId = zone_id;
      if (zone_id) {
        // Zone existante sélectionnée : vérifier qu'elle existe
        const zone = await zoneService.findById(zone_id);
        if (!zone || !zone.actif) {
          return res.status(400).json({ message: "Zone invalide." });
        }
        finalZoneId = zone_id;
      } else if (zone_nom && zone_nom.trim()) {
        // Zone personnalisée saisie : chercher si elle existe, sinon créer
        try {
          // Chercher toutes les zones actives avec ce nom (recherche partielle)
          const existingZones = await zoneService.findAll({
            nom: zone_nom.trim(),
            actif: true,
          });

          // Chercher une correspondance exacte (insensible à la casse)
          const exactMatch = existingZones.find(
            (z) => z.nom.toLowerCase() === zone_nom.trim().toLowerCase(),
          );

          if (exactMatch) {
            // Zone existe déjà avec le même nom, utiliser son ID
            finalZoneId = exactMatch.id;
            console.log(
              `✅ Zone existante utilisée: ${exactMatch.nom} (${exactMatch.id})`,
            );
          } else {
            // Créer une nouvelle zone avec le nom fourni
            const newZone = await zoneService.create({
              nom: zone_nom.trim(),
              type: "secteur", // Type par défaut pour zones personnalisées
              actif: true,
            });
            finalZoneId = newZone.id;
            console.log(
              `✅ Zone créée automatiquement: ${newZone.nom} (${newZone.id})`,
            );
          }
        } catch (zoneError) {
          console.error(
            "Erreur lors de la recherche/création de la zone:",
            zoneError,
          );
          // Si la création échoue, on peut quand même créer l'agent sans zone
          finalZoneId = null;
        }
      }
      // Si ni zone_id ni zone_nom, finalZoneId reste null (agent sans zone)

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé." });
      }

      // Créer l'agent (zone_id peut être null pour Super Admin)
      let agent;
      try {
        // S'assurer que zone_id est null et non undefined
        const zoneIdToInsert = finalZoneId !== undefined ? finalZoneId : null;

        agent = await userService.create({
          email,
          password,
          nom,
          prenom,
          telephone,
          role: "agent_communal",
          zone_id: zoneIdToInsert, // Peut être null si Super Admin crée sans zone
          actif: true,
          cree_par: req.user.id,
        });
      } catch (createError) {
        console.error("Erreur lors de la création de l'agent:", createError);
        return res.status(500).json({
          message: "Erreur serveur lors de la création de l'agent.",
          error:
            process.env.NODE_ENV === "development"
              ? createError.message
              : undefined,
        });
      }

      // Envoyer un email de bienvenue (optionnel)
      try {
        await emailService.sendWelcomeEmail(email, nom, "agent communal");
      } catch (emailError) {
        console.warn("Impossible d'envoyer l'email de bienvenue:", emailError);
      }

      // Logger l'action (ne bloque pas si ça échoue)
      auditService
        .log({
          user_id: req.user.id,
          action: "CREATE_AGENT",
          resource_type: "user",
          resource_id: agent.id,
          details: {
            agent_email: email,
            zone_id: finalZoneId,
          },
          ip_address: req.ip,
          user_agent: req.get("user-agent"),
          zone_id: finalZoneId,
        })
        .catch((err) => {
          // L'audit service gère déjà les erreurs, mais on catch au cas où
          console.warn("Audit logging échoué (non bloquant):", err.message);
        });

      const { password: _, ...agentWithoutPassword } = agent;
      res.status(201).json({
        message: "Agent communal créé avec succès.",
        agent: agentWithoutPassword,
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'agent:", error);
      const errorMessage =
        error.message || "Erreur serveur lors de la création de l'agent.";
      res.status(500).json({
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

// Lister tous les administrateurs (Super Admin uniquement)
router.get("/admins", auth, requireSuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { data: users, count } = await userService.findAll(
      { role: "admin" },
      { page, limit },
    );

    const adminsWithoutPassword = users.map(({ password, ...user }) => user);

    res.json({
      admins: adminsWithoutPassword,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Lister les agents (Admin et Super Admin voient tous, filtre zone optionnel)
router.get(
  "/agents",
  auth,
  requirePermission("manage_agents"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const zoneId = req.query.zone_id;

      let filters = { role: "agent_communal" };

      if (zoneId) {
        filters.zone_id = zoneId;
      }

      const { data: users, count } = await userService.findAll(filters, {
        page,
        limit,
      });

      const agentsWithoutPassword = users.map(({ password, ...user }) => user);

      res.json({
        agents: agentsWithoutPassword,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

// Assigner une zone à un admin (Super Admin uniquement)
router.patch(
  "/admins/:id/zone",
  auth,
  requireSuperAdmin,
  logAction("ASSIGN_ZONE_ADMIN", "user"),
  [body("zone_id").isUUID()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { zone_id } = req.body;
      const adminId = req.params.id;

      // Vérifier que l'admin existe
      const admin = await userService.findById(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Administrateur non trouvé." });
      }

      if (admin.role !== "admin") {
        return res
          .status(400)
          .json({ message: "Cet utilisateur n'est pas un administrateur." });
      }

      // Vérifier la zone
      if (zone_id) {
        const zone = await zoneService.findById(zone_id);
        if (!zone || !zone.actif) {
          return res.status(400).json({ message: "Zone invalide." });
        }
      }

      // Mettre à jour
      const updatedAdmin = await userService.update(adminId, { zone_id });

      // Logger
      await auditService.log({
        user_id: req.user.id,
        action: "ASSIGN_ZONE_ADMIN",
        resource_type: "user",
        resource_id: adminId,
        details: {
          admin_email: admin.email,
          zone_id,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
      });

      const { password, ...adminWithoutPassword } = updatedAdmin;
      res.json({
        message: "Zone assignée avec succès.",
        admin: adminWithoutPassword,
      });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

// Assigner une zone à un agent (Super Admin ou Admin de zone)
router.patch(
  "/agents/:id/zone",
  auth,
  requirePermission("assign_zones"),
  logAction("ASSIGN_ZONE_AGENT", "user"),
  [body("zone_id").isUUID()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { zone_id } = req.body;
      const agentId = req.params.id;

      // Admin ne peut assigner que dans sa zone
      if (req.user.role === "admin" && req.user.zone_id !== zone_id) {
        return res.status(403).json({
          message: "Vous ne pouvez assigner des agents qu'à votre zone.",
        });
      }

      // Vérifier que l'agent existe
      const agent = await userService.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent non trouvé." });
      }

      if (agent.role !== "agent_communal") {
        return res
          .status(400)
          .json({ message: "Cet utilisateur n'est pas un agent communal." });
      }

      // Vérifier la zone
      const zone = await zoneService.findById(zone_id);
      if (!zone || !zone.actif) {
        return res.status(400).json({ message: "Zone invalide." });
      }

      // Mettre à jour
      const updatedAgent = await userService.update(agentId, { zone_id });

      // Logger
      await auditService.log({
        user_id: req.user.id,
        action: "ASSIGN_ZONE_AGENT",
        resource_type: "user",
        resource_id: agentId,
        details: {
          agent_email: agent.email,
          zone_id,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
        zone_id,
      });

      const { password, ...agentWithoutPassword } = updatedAgent;
      res.json({
        message: "Zone assignée avec succès.",
        agent: agentWithoutPassword,
      });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

// Supprimer un administrateur (Super Admin uniquement)
router.delete(
  "/admins/:id",
  auth,
  requireSuperAdmin,
  logAction("DELETE_ADMIN", "user"),
  async (req, res) => {
    try {
      const adminId = req.params.id;

      // Ne pas permettre de se supprimer soi-même
      if (adminId === req.user.id) {
        return res.status(400).json({
          message: "Vous ne pouvez pas supprimer votre propre compte.",
        });
      }

      const admin = await userService.findById(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Administrateur non trouvé." });
      }

      if (admin.role !== "admin") {
        return res
          .status(400)
          .json({ message: "Cet utilisateur n'est pas un administrateur." });
      }

      // Désactiver au lieu de supprimer
      await userService.update(adminId, { actif: false });

      // Logger
      await auditService.log({
        user_id: req.user.id,
        action: "DELETE_ADMIN",
        resource_type: "user",
        resource_id: adminId,
        details: {
          admin_email: admin.email,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
      });

      res.json({ message: "Administrateur désactivé avec succès." });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

// Supprimer un agent (Super Admin ou Admin de zone)
router.delete(
  "/agents/:id",
  auth,
  requirePermission("manage_agents"),
  logAction("DELETE_AGENT", "user"),
  async (req, res) => {
    try {
      const agentId = req.params.id;

      const agent = await userService.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent non trouvé." });
      }

      if (agent.role !== "agent_communal") {
        return res
          .status(400)
          .json({ message: "Cet utilisateur n'est pas un agent communal." });
      }

      // Admin ne peut supprimer que les agents de sa zone
      if (req.user.role === "admin" && agent.zone_id !== req.user.zone_id) {
        return res.status(403).json({
          message: "Vous ne pouvez supprimer que les agents de votre zone.",
        });
      }

      // Désactiver au lieu de supprimer
      await userService.update(agentId, { actif: false });

      // Logger
      await auditService.log({
        user_id: req.user.id,
        action: "DELETE_AGENT",
        resource_type: "user",
        resource_id: agentId,
        details: {
          agent_email: agent.email,
          zone_id: agent.zone_id,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
        zone_id: agent.zone_id,
      });

      res.json({ message: "Agent désactivé avec succès." });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  },
);

module.exports = router;
