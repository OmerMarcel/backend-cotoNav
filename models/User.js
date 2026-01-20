const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  telephone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.authProvider; // Requis seulement si pas d'authentification externe
    }
  },
  authProvider: {
    type: String,
    enum: ['email', 'google', 'facebook', 'phone'],
    default: 'email'
  },
  role: {
    type: String,
    enum: ['citoyen', 'moderateur', 'admin'],
    default: 'citoyen'
  },
  avatar: String,
  favoris: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Infrastructure'
  }],
  contributions: {
    infrastructuresProposees: {
      type: Number,
      default: 0
    },
    avisLaisses: {
      type: Number,
      default: 0
    },
    signalements: {
      type: Number,
      default: 0
    }
  },
  actif: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

