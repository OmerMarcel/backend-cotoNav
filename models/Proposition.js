const mongoose = require('mongoose');

const propositionSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['toilettes_publiques', 'parc_jeux', 'centre_sante', 'installation_sportive', 'espace_divertissement', 'autre']
  },
  description: {
    type: String,
    trim: true
  },
  localisation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    adresse: {
      type: String,
      required: true
    },
    quartier: {
      type: String,
      required: true
    },
    commune: {
      type: String,
      default: 'Cotonou'
    }
  },
  photos: [{
    url: String,
    uploadedAt: Date
  }],
  proposePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statut: {
    type: String,
    enum: ['en_attente', 'approuve', 'rejete'],
    default: 'en_attente'
  },
  moderePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentaireModeration: String,
  modereLe: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

propositionSchema.index({ statut: 1 });
propositionSchema.index({ proposePar: 1 });
propositionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Proposition', propositionSchema);

