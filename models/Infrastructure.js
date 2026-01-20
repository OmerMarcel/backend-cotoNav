const mongoose = require('mongoose');

const infrastructureSchema = new mongoose.Schema({
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
  horaires: {
    lundi: { ouvert: Boolean, debut: String, fin: String },
    mardi: { ouvert: Boolean, debut: String, fin: String },
    mercredi: { ouvert: Boolean, debut: String, fin: String },
    jeudi: { ouvert: Boolean, debut: String, fin: String },
    vendredi: { ouvert: Boolean, debut: String, fin: String },
    samedi: { ouvert: Boolean, debut: String, fin: String },
    dimanche: { ouvert: Boolean, debut: String, fin: String }
  },
  equipements: [String],
  accessibilite: {
    pmr: { type: Boolean, default: false },
    enfants: { type: Boolean, default: false }
  },
  contact: {
    telephone: String,
    email: String
  },
  etat: {
    type: String,
    enum: ['excellent', 'bon', 'moyen', 'degrade', 'ferme'],
    default: 'bon'
  },
  noteMoyenne: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  nombreAvis: {
    type: Number,
    default: 0
  },
  niveauFrequentation: {
    type: String,
    enum: ['faible', 'moyen', 'eleve'],
    default: 'moyen'
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  valide: {
    type: Boolean,
    default: false
  },
  validePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  valideLe: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index géospatial pour les requêtes de proximité
infrastructureSchema.index({ 'localisation': '2dsphere' });
infrastructureSchema.index({ type: 1 });
infrastructureSchema.index({ 'localisation.quartier': 1 });
infrastructureSchema.index({ valide: 1 });

module.exports = mongoose.model('Infrastructure', infrastructureSchema);

