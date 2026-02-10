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

// Mapping MIME -> extension pour tous formats image (jpg, png, gif, webp, bmp, heic, etc.)
const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/bmp': 'bmp', 'image/heic': 'heic', 'image/heif': 'heif',
};
const VALID_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif']);

// Upload d'image unique (pour mobile) — accepte tout format image/*
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie.' });
    }

    let fileExt = (req.file.originalname.split('.').pop() || '').toLowerCase();
    if (!VALID_EXT.has(fileExt)) {
      fileExt = MIME_TO_EXT[req.file.mimetype] || 'jpg';
    }
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `infrastructures/${fileName}`;

    try {
      // Essayer d'uploader vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('infrastructures')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
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

