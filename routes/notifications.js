const express = require('express')
const { auth } = require('../middleware/auth')
const notificationService = require('../services/notificationService')

const router = express.Router()

// Enregistrer / rafraîchir le token FCM (Web)
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { token, platform } = req.body || {}

    if (!token) {
      return res.status(400).json({ message: 'token requis' })
    }

    const saved = await notificationService.upsertFcmToken({
      userId: req.user.id,
      role: req.user.role,
      platform: platform || 'web',
      token,
    })

    res.json({ message: 'Token enregistré', data: saved })
  } catch (error) {
    console.error('❌ Erreur /notifications/fcm-token:', error)
    res.status(500).json({ message: "Erreur serveur lors de l'enregistrement du token." })
  }
})

module.exports = router


