const mongoose = require('mongoose');

const avisSchema = new mongoose.Schema({
  infrastructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Infrastructure',
    required: true
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  commentaire: {
    type: String,
    trim: true
  },
  photos: [{
    url: String,
    uploadedAt: Date
  }],
  approuve: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

avisSchema.index({ infrastructure: 1 });
avisSchema.index({ utilisateur: 1 });
avisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Avis', avisSchema);

