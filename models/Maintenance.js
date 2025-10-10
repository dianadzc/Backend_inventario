// models/Maintenance.js
const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  maintenance_code: {
    type: String,
    required: true,
    unique: true
  },
  asset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  type: {
    type: String,
    enum: ['preventive', 'corrective', 'predictive'],
    default: 'preventive'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  scheduled_date: {
    type: Date,
    required: true
  },
  completed_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  technician_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cost: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índices
maintenanceSchema.index({ maintenance_code: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ scheduled_date: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);