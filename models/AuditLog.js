// Backend/models/AuditLog.js - CREAR MODELO
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  username: String,
  action: String, // 'login', 'logout', 'create', 'update', 'delete'
  module: String, // 'inventory', 'incidents', 'users', etc.
  description: String,
  ip_address: String,
  user_agent: String,
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  }
}, {
  timestamps: true
});

auditLogSchema.index({ user_id: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);