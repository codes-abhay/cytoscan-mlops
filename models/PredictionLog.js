const mongoose = require('mongoose');

const PredictionLogSchema = new mongoose.Schema({
  patientName: {
    type: String,
    default: "Anonymous Patient",
    trim: true
  },
  // Store the 30 features in a clean nested schema for organizational hygiene
  cellMetrics: {
    type: Map,
    of: Number,
    required: true
  },
  prediction: {
    type: String,
    required: true,
    enum: ['Malignant', 'Benign']
  },
  probability: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// High-Yield Database Indexing (demonstrating ESR - Equality, Sort, Range rules)
// Indexing on prediction (equality) and createdAt (sort/range) for rapid audit-log analytics queries
PredictionLogSchema.index({ prediction: 1, createdAt: -1 });

module.exports = mongoose.model('PredictionLog', PredictionLogSchema);
