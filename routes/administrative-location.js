const express = require("express");
const administrativeLocationService = require("../services/administrativeLocationService");

const router = express.Router();

// Obtenir la localisation administrative a partir d'une position GPS
router.get("/", async (req, res) => {
  try {
    const latitudeRaw = req.query.latitude ?? req.query.lat;
    const longitudeRaw = req.query.longitude ?? req.query.lng;

    const latitude = latitudeRaw !== undefined ? Number(latitudeRaw) : NaN;
    const longitude = longitudeRaw !== undefined ? Number(longitudeRaw) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        message: "Latitude et longitude sont requises.",
      });
    }

    const location =
      await administrativeLocationService.getAdministrativeLocation(
        latitude,
        longitude,
      );

    if (!location || !location.found) {
      return res.status(404).json({
        message: "Localisation administrative non trouvee.",
        data: location || null,
      });
    }

    return res.status(200).json({
      data: location,
    });
  } catch (error) {
    console.error("Erreur localisation administrative:", error);
    return res.status(500).json({
      message: "Erreur serveur.",
      error: error.message,
    });
  }
});

module.exports = router;
