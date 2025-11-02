// Backend/models/AssetCatalog.js
const mongoose = require('mongoose');

const assetCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

assetCatalogSchema.index({ name: 1 });

module.exports = mongoose.model('AssetCatalog', assetCatalogSchema);