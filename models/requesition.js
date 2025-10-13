// models/Requisition.js
const mongoose = require('mongoose');

const requisitionSchema = new mongoose.Schema({
  requisition_code: {
    type: String,
    required: true,
    unique: true
  },
  request_type: {
    type: String,
    enum: ['transferencia', 'pago_tarjeta', 'efectivo', 'pago_linea'],
    required: true
  },
  request_date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['MXN', 'USD'],
    default: 'MXN'
  },
  amount_in_words: {
    type: String,
    required: true
  },
  payable_to: {
    type: String,
    required: true
  },
  concept: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'SISTEMAS'
  },
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  approval_date: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índices
requisitionSchema.index({ requisition_code: 1 });
requisitionSchema.index({ status: 1 });
requisitionSchema.index({ requested_by: 1 });

module.exports = mongoose.model('Requisition', requisitionSchema);