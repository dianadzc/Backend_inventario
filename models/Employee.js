// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);