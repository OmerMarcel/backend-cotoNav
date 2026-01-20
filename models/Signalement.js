const mongoose = require('mongoose');

const signalementSchema = new mongoose.Schema({
  infrastructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Infrastructure',
    required: true
  },
  type: {
    type: String,
    enum: ['equipement_degrade', 'fermeture_temporaire', 'information_incorrecte', 'autre'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  photos: [{
    url: String,
    uploadedAt: Date
  }],
  signalePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statut: {
    type: String,
    enum: ['nouveau', 'en_cours', 'resolu', 'rejete'],
    default: 'nouveau'
  },
  traitePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentaireTraitement: String,
  traiteLe: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

signalementSchema.index({ statut: 1 });
signalementSchema.index({ infrastructure: 1 });
signalementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Signalement', signalementSchema);

