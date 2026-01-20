const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configuration multer pour les fichiers en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Upload d'image unique (pour mobile)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie.' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `infrastructures/${fileName}`;

    try {
      // Essayer d'uploader vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('infrastructures')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        // Si erreur (bucket non configuré), utiliser base64 comme fallback
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        
        return res.json({ 
          url: dataUrl,
          uploadedAt: new Date().toISOString()
        });
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('infrastructures')
        .getPublicUrl(filePath);

      res.json({
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString()
      });
    } catch (uploadError) {
      console.error('Erreur lors de l\'upload:', uploadError);
      // En cas d'erreur, utiliser base64 comme fallback
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
      
      res.json({
        url: dataUrl,
        uploadedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload.' });
  }
});

module.exports = router;

