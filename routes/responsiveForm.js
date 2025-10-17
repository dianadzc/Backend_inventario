const express = require('express');
const router = express.Router();
const ResponsiveForm = require('../models/ResponsiveForm');
const Equipment = require('../models/Equipment');
const Employee = require('../models/Employee');
const { body, validationResult } = require('express-validator');

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ========== RESPONSIVAS ==========

// Obtener todas las responsivas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const forms = await ResponsiveForm.find()
      .populate('created_by', 'username full_name email')
      .sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    console.error('Error al obtener responsivas:', error);
    res.status(500).json({ message: 'Error al obtener responsivas' });
  }
});

// Obtener una responsiva por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const form = await ResponsiveForm.findById(req.params.id)
      .populate('created_by', 'username full_name email');
    
    if (!form) {
      return res.status(404).json({ message: 'Responsiva no encontrada' });
    }
    
    res.json(form);
  } catch (error) {
    console.error('Error al obtener responsiva:', error);
    res.status(500).json({ message: 'Error al obtener responsiva' });
  }
});

// Crear nueva responsiva
router.post('/', authenticateToken, [
  body('equipment_type').notEmpty().withMessage('Tipo de equipo es requerido'),
  body('brand').notEmpty().withMessage('Marca es requerida'),
  body('serial_number').notEmpty().withMessage('Número de serie es requerido'),
  body('acquisition_cost').isNumeric().withMessage('Costo debe ser numérico'),
  body('employee_name').notEmpty().withMessage('Nombre del empleado es requerido'),
  body('employee_position').notEmpty().withMessage('Cargo del empleado es requerido'),
  body('delivery_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generar código único
    const lastForm = await ResponsiveForm.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    
    if (lastForm && lastForm.form_code) {
      const lastNumber = parseInt(lastForm.form_code.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    const form_code = `RESP-${String(nextNumber).padStart(6, '0')}`;

    const form = new ResponsiveForm({
      form_code,
      equipment_type: req.body.equipment_type,
      brand: req.body.brand,
      serial_number: req.body.serial_number,
      acquisition_cost: req.body.acquisition_cost,
      delivery_date: req.body.delivery_date || new Date(),
      employee_name: req.body.employee_name,
      employee_position: req.body.employee_position,
      department: req.body.department || 'sistemas',
      created_by: req.user.id,
      status: 'active'
    });

    await form.save();

    const populatedForm = await ResponsiveForm.findById(form._id)
      .populate('created_by', 'username full_name email');

    res.status(201).json({
      message: 'Responsiva creada exitosamente',
      form: populatedForm
    });
  } catch (error) {
    console.error('Error al crear responsiva:', error);
    res.status(500).json({ message: 'Error al crear responsiva' });
  }
});

// Actualizar responsiva
router.put('/:id', authenticateToken, [
  body('equipment_type').optional().notEmpty(),
  body('brand').optional().notEmpty(),
  body('serial_number').optional().notEmpty(),
  body('acquisition_cost').optional().isNumeric(),
  body('employee_name').optional().notEmpty(),
  body('employee_position').optional().notEmpty(),
  body('delivery_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const form = await ResponsiveForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Responsiva no encontrada' });
    }

    // Actualizar campos
    if (req.body.equipment_type) form.equipment_type = req.body.equipment_type;
    if (req.body.brand) form.brand = req.body.brand;
    if (req.body.serial_number) form.serial_number = req.body.serial_number;
    if (req.body.acquisition_cost) form.acquisition_cost = req.body.acquisition_cost;
    if (req.body.employee_name) form.employee_name = req.body.employee_name;
    if (req.body.employee_position) form.employee_position = req.body.employee_position;
    if (req.body.delivery_date) form.delivery_date = req.body.delivery_date;
    if (req.body.status) form.status = req.body.status;

    await form.save();

    const populatedForm = await ResponsiveForm.findById(form._id)
      .populate('created_by', 'username full_name email');

    res.json({
      message: 'Responsiva actualizada exitosamente',
      form: populatedForm
    });
  } catch (error) {
    console.error('Error al actualizar responsiva:', error);
    res.status(500).json({ message: 'Error al actualizar responsiva' });
  }
});

// Eliminar responsiva
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const form = await ResponsiveForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Responsiva no encontrada' });
    }

    await ResponsiveForm.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Responsiva eliminada exitosamente',
      id: req.params.id 
    });
  } catch (error) {
    console.error('Error al eliminar responsiva:', error);
    res.status(500).json({ message: 'Error al eliminar responsiva' });
  }
});

// ========== EQUIPOS ==========

// Obtener todos los equipos
router.get('/catalog/equipments', authenticateToken, async (req, res) => {
  try {
    const equipments = await Equipment.find().sort({ name: 1 });
    res.json(equipments);
  } catch (error) {
    console.error('Error al obtener equipos:', error);
    res.status(500).json({ message: 'Error al obtener equipos' });
  }
});

// Crear nuevo equipo
router.post('/catalog/equipments', authenticateToken, [
  body('name').notEmpty().withMessage('Nombre del equipo es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const equipment = new Equipment({
      name: req.body.name
    });

    await equipment.save();

    res.status(201).json({
      message: 'Equipo agregado exitosamente',
      equipment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Este equipo ya existe' });
    }
    console.error('Error al crear equipo:', error);
    res.status(500).json({ message: 'Error al crear equipo' });
  }
});

// ========== EMPLEADOS ==========

// Obtener todos los empleados
router.get('/catalog/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ full_name: 1 });
    res.json(employees);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

// Crear nuevo empleado
router.post('/catalog/employees', authenticateToken, [
  body('full_name').notEmpty().withMessage('Nombre completo es requerido'),
  body('position').notEmpty().withMessage('Cargo es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = new Employee({
      full_name: req.body.full_name,
      position: req.body.position,
      department: req.body.department
    });

    await employee.save();

    res.status(201).json({
      message: 'Empleado agregado exitosamente',
      employee
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ message: 'Error al crear empleado' });
  }
});

module.exports = router;