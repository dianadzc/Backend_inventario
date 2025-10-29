// models/ResponsiveForm.js
const mongoose = require('mongoose');

const responsiveFormSchema = new mongoose.Schema({
  form_code: {
    type: String,
    required: true,
    unique: true
  },
  equipment_type: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  serial_number: {
    type: String,
    required: true
  },
  acquisition_cost: {
    type: Number,
    required: true
  },
  delivery_date: {
    type: Date,
    default: Date.now
  },
  employee_name: {
    type: String,
    required: true
  },
  employee_position: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'sistemas'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'damaged'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ResponsiveForm', responsiveFormSchema);