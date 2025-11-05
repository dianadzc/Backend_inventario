// Backend/utils/passwordValidator.js - CREAR
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
  }

  // ⭐ Contraseñas comunes prohibidas
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'admin123', 
    'password123', 'hotel123', 'beachscape'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Contraseña demasiado común. Elige una más segura');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };