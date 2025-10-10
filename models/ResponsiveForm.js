// models/ResponsiveForm.js
const mongoose = require('mongoose');

const responsiveFormSchema = new mongoose.Schema({
  form_code: {
    type: String,
    required: true,
    unique: true
  },
  asset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  previous_responsible_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  new_responsible_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transfer_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  conditions: {
    type: String,
    default: ''
  },
  observations: {
    type: String,
    default: ''
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Índices
responsiveFormSchema.index({ form_code: 1 });
responsiveFormSchema.index({ status: 1 });

module.exports = mongoose.model('ResponsiveForm', responsiveFormSchema);