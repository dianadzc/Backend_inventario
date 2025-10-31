// models/Asset.js
const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  asset_code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {  // ⭐ AGREGAR ESTE CAMPO
    type: String,
    default: 'Otro'
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetCategory'
  },
  brand: {
    type: String,
    default: ''
  },
  serial_number: {
    type: String,
    default: ''
  },
  purchase_date: {
    type: Date
  },
  purchase_price: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'in_use', 'maintenance', 'inactive'],
    default: 'active'
  },
  responsible_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  warranty_expiry: {
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
assetSchema.index({ asset_code: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ category_id: 1 });

module.exports = mongoose.model('Asset', assetSchema);