// Backend/models/TypeCatalog.js
const mongoose = require('mongoose');

const typeCatalogSchema = new mongoose.Schema({
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

typeCatalogSchema.index({ name: 1 });

module.exports = mongoose.model('TypeCatalog', typeCatalogSchema);