// Backend/middleware/auditLogger.js - CREAR MIDDLEWARE
const AuditLog = require('../models/AuditLog');

const logAction = async (req, action, module, description, status = 'success') => {
  try {
    await AuditLog.create({
      user_id: req.user?.id || req.user?._id,
      username: req.user?.username || 'anonymous',
      action,
      module,
      description,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      status
    });
  } catch (error) {
    console.error('Error al guardar log:', error);
  }
};

module.exports = { logAction };