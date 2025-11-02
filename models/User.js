// Backend/models/User.js - EMAIL OPCIONAL
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // ⭐ Permite múltiples valores null/undefined
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  full_name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  department: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);