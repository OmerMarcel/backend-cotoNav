const express = require("express");
const signalementService = require("../services/signalementService");
const { auth, requireStaff } = require("../middleware/auth");
const notificationService = require("../services/notificationService");
const auditService = require("../services/auditService");

const router = express.Router();

// Créer un nouveau signalement (depuis l'application mobile ou le dashboard)
router.post("/", auth, async (req, res) => {
  try {
    const { infrastructureId, type, description, photos } = req.body;

    if (!infrastructureId || !type || !description) {
      return res
        .status(400)
        .json({
          message: "infrastructureId, type et description sont requis.",
        });
    }

    const signalement = await signalementService.create({
      infrastructureId,
      type,
      description,
      photos: photos || [],
      signalePar: req.user.id,
    });

    // 📝 Traçabilité Audit
    await auditService.log({
      user_id: req.user.id,
      user_role: req.user.role || "citoyen",
      action: "SIGNALEMENT_CREATED",
      resource_type: "signalements",
      resource_id: signalement.id || signalement._id,
      details: {
        infrastructureId,
        type,
        description,
      },
      ip_address: req.ip || req.connection?.remoteAddress,
    });

    res.status(201).json({ signalement });
  } catch (error) {
    console.error("Erreur lors de la création du signalement:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la création du signalement." });
  }
});

// Obtenir tous les signalements (personnel: admin/super_admin/agent_communal)
router.get("/", auth, requireStaff, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {};
    if (req.query.statut) filters.statut = req.query.statut;
    if (req.query.type) filters.type = req.query.type;

    const { data: signalements, count } = await signalementService.findAll(
      filters,
      { page, limit },
    );

    res.json({
      signalements,
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

// Obtenir un signalement par ID (personnel: admin/super_admin/agent_communal)
router.get("/:id", auth, requireStaff, async (req, res) => {
  try {
    const signalement = await signalementService.findById(req.params.id);
    if (!signalement) {
      return res.status(404).json({ message: "Signalement non trouvé." });
    }
    res.json(signalement);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Mettre à jour le statut d'un signalement
router.patch("/:id", auth, requireStaff, async (req, res) => {
  try {
    const { statut, commentaireTraitement } = req.body;
    const signalementId = req.params.id;

    console.log("📝 Mise à jour signalement:", { id: signalementId, statut });

    // Récupérer le signalement avant la mise à jour pour avoir les informations
    let oldSignalement;
    try {
      oldSignalement = await signalementService.findById(signalementId);
    } catch (findError) {
      console.error(
        "❌ Erreur lors de la récupération du signalement:",
        findError,
      );
      return res.status(404).json({ message: "Signalement non trouvé." });
    }

    if (!oldSignalement) {
      return res.status(404).json({ message: "Signalement non trouvé." });
    }

    const updateData = {
      statut,
    };

    if (statut !== "nouveau") {
      updateData.traite_par = req.user.id;
      updateData.traite_le = new Date().toISOString();
      if (commentaireTraitement) {
        updateData.commentaire_traitement = commentaireTraitement;
      }
    }

    const signalement = await signalementService.update(
      signalementId,
      updateData,
    );

    if (!signalement) {
      return res
        .status(404)
        .json({ message: "Signalement non trouvé après mise à jour." });
    }

    // Envoyer une notification push aux utilisateurs (citoyens) selon le statut
    if (
      statut === "resolu" ||
      statut === "valide" ||
      statut === "rejete" ||
      statut === "en_cours"
    ) {
      try {
        const infraName =
          signalement?.infrastructure?.nom ||
          oldSignalement?.infrastructure?.nom ||
          "Infrastructure";
        let title, message;

        if (statut === "resolu" || statut === "valide") {
          title = `Signalement résolu`;
          message = `Votre signalement concernant "${infraName}" a été résolu et pris en compte`;
        } else if (statut === "rejete") {
          title = `Signalement rejeté`;
          message = `Votre signalement concernant "${infraName}" a été rejeté`;
        } else if (statut === "en_cours") {
          title = `Signalement en cours de traitement`;
          message = `Votre signalement concernant "${infraName}" est en cours de traitement`;
        }

        await notificationService.sendPushOnly({
          roles: ["citoyen"],
          title: title,
          body: message,
          href: `/signalement/${signalement.id || signalementId}`,
          type: "signalement",
        });
      } catch (e) {
        console.warn(
          "⚠️ Notification push signalement traité échouée:",
          e.message,
        );
      }
    }

    // 📝 Traçabilité Audit
    await auditService.log({
      user_id: req.user.id,
      user_role: req.user.role || "staff",
      action: `SIGNALEMENT_${statut.toUpperCase()}`,
      resource_type: "signalements",
      resource_id: signalementId,
      details: {
        statut,
        commentaire: commentaireTraitement || "",
      },
      ip_address: req.ip || req.connection?.remoteAddress,
    });

    res.json(signalement);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du signalement:", error);
    res.status(500).json({
      message: "Erreur serveur lors de la mise à jour du signalement.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
