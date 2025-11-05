// Backend/middleware/rateLimiter.js - CREAR ARCHIVO
const rateLimit = require('express-rate-limit');

// ⭐ Limitar intentos de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ⭐ Limitar peticiones generales
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 peticiones por minuto
  message: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
});

module.exports = { loginLimiter, generalLimiter };