// models/Incident.js
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incident_code: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  asset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  reported_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reported_date: {
    type: Date,
    default: Date.now
  },
  resolved_date: {
    type: Date
  },
  solution: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índices
incidentSchema.index({ incident_code: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ priority: 1 });

module.exports = mongoose.model('Incident', incidentSchema);