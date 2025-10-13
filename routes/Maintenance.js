// routes/maintenance.js - VERSIÓN MONGODB
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Maintenance = require('../models/Maintenance');

const router = express.Router();

// Función para generar código de mantenimiento
const generateMaintenanceCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MNT-${year}${month}${day}-${random}`;
};

// Obtener todos los mantenimientos con filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, asset_id, technician_id } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (asset_id) query.asset_id = asset_id;
        if (technician_id) query.technician_id = technician_id;

        const maintenances = await Maintenance.find(query)
            .populate('asset_id', 'name asset_code')
            .populate('technician_id', 'full_name')
            .sort({ scheduled_date: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Maintenance.countDocuments(query);

        res.json({
            maintenances,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        res.status(500).json({ message: 'Error al obtener mantenimientos' });
    }
});

// Obtener un mantenimiento específico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id)
            .populate('asset_id', 'name asset_code')
            .populate('technician_id', 'full_name');

        if (!maintenance) {
            return res.status(404).json({ message: 'Mantenimiento no encontrado' });
        }

        res.json({ maintenance });
    } catch (error) {
        console.error('Error al obtener mantenimiento:', error);
        res.status(500).json({ message: 'Error al obtener mantenimiento' });
    }
});

// Crear nuevo mantenimiento
router.post('/', authenticateToken, [
    body('asset_id').notEmpty().withMessage('Activo válido es requerido'),
    body('type').isIn(['preventive', 'corrective', 'predictive']).withMessage('Tipo de mantenimiento inválido'),
    body('title').notEmpty().withMessage('Título es requerido'),
    body('scheduled_date').isISO8601().withMessage('Fecha programada válida es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const maintenance_code = generateMaintenanceCode();

        const maintenance = new Maintenance({
            maintenance_code,
            asset_id: req.body.asset_id,
            type: req.body.type || 'preventive',
            title: req.body.title,
            description: req.body.description,
            scheduled_date: req.body.scheduled_date,
            technician_id: req.body.technician_id,
            cost: req.body.cost,
            supplier: req.body.supplier,
            notes: req.body.notes,
            status: 'scheduled'
        });

        await maintenance.save();

        res.status(201).json({
            message: 'Mantenimiento programado exitosamente',
            maintenance
        });
    } catch (error) {
        console.error('Error al crear mantenimiento:', error);
        res.status(500).json({ message: 'Error al crear mantenimiento' });
    }
});

// Actualizar mantenimiento
router.put('/:id', authenticateToken, [
    body('title').notEmpty().withMessage('Título es requerido'),
    body('type').isIn(['preventive', 'corrective', 'predictive']).withMessage('Tipo de mantenimiento inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            {
                type: req.body.type,
                title: req.body.title,
                description: req.body.description,
                scheduled_date: req.body.scheduled_date,
                technician_id: req.body.technician_id,
                cost: req.body.cost,
                supplier: req.body.supplier,
                notes: req.body.notes,
                status: req.body.status
            },
            { new: true, runValidators: true }
        );

        if (!maintenance) {
            return res.status(404).json({ message: 'Mantenimiento no encontrado' });
        }

        res.json({ message: 'Mantenimiento actualizado exitosamente', maintenance });
    } catch (error) {
        console.error('Error al actualizar mantenimiento:', error);
        res.status(500).json({ message: 'Error al actualizar mantenimiento' });
    }
});

// Iniciar mantenimiento
router.put('/:id/start', authenticateToken, async (req, res) => {
    try {
        const maintenance = await Maintenance.findOneAndUpdate(
            { _id: req.params.id, status: 'scheduled' },
            { status: 'in_progress' },
            { new: true }
        );

        if (!maintenance) {
            return res.status(404).json({ message: 'Mantenimiento no encontrado o ya iniciado' });
        }

        res.json({ message: 'Mantenimiento iniciado exitosamente' });
    } catch (error) {
        console.error('Error al iniciar mantenimiento:', error);
        res.status(500).json({ message: 'Error al iniciar mantenimiento' });
    }
});

// Completar mantenimiento
router.put('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const updateData = {
            status: 'completed',
            completed_date: new Date()
        };

        if (req.body.notes) updateData.notes = req.body.notes;
        if (req.body.cost) updateData.cost = req.body.cost;

        const maintenance = await Maintenance.findOneAndUpdate(
            { _id: req.params.id, status: { $in: ['scheduled', 'in_progress'] } },
            updateData,
            { new: true }
        );

        if (!maintenance) {
            return res.status(404).json({ message: 'Mantenimiento no encontrado o ya completado' });
        }

        res.json({ message: 'Mantenimiento completado exitosamente' });
    } catch (error) {
        console.error('Error al completar mantenimiento:', error);
        res.status(500).json({ message: 'Error al completar mantenimiento' });
    }
});

// Obtener mantenimientos próximos
router.get('/upcoming/list', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + parseInt(days));

        const upcomingMaintenances = await Maintenance.find({
            scheduled_date: { $gte: today, $lte: futureDate },
            status: 'scheduled'
        })
            .populate('asset_id', 'name asset_code')
            .populate('technician_id', 'full_name')
            .sort({ scheduled_date: 1 });

        res.json({ upcomingMaintenances });
    } catch (error) {
        console.error('Error al obtener mantenimientos próximos:', error);
        res.status(500).json({ message: 'Error al obtener mantenimientos próximos' });
    }
});

// Obtener mantenimientos vencidos
router.get('/overdue/list', authenticateToken, async (req, res) => {
    try {
        const overdueMaintenances = await Maintenance.find({
            scheduled_date: { $lt: new Date() },
            status: 'scheduled'
        })
            .populate('asset_id', 'name asset_code')
            .populate('technician_id', 'full_name')
            .sort({ scheduled_date: 1 });

        res.json({ overdueMaintenances });
    } catch (error) {
        console.error('Error al obtener mantenimientos vencidos:', error);
        res.status(500).json({ message: 'Error al obtener mantenimientos vencidos' });
    }
});

// Obtener estadísticas de mantenimientos
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(today.getMonth() - 12);

        const stats = {
            total: [{ count: await Maintenance.countDocuments() }],
            byStatus: await Maintenance.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            byType: await Maintenance.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            upcoming: [{
                count: await Maintenance.countDocuments({
                    scheduled_date: { $gte: today, $lte: thirtyDaysFromNow },
                    status: 'scheduled'
                })
            }],
            overdue: [{
                count: await Maintenance.countDocuments({
                    scheduled_date: { $lt: today },
                    status: 'scheduled'
                })
            }],
            totalCost: await Maintenance.aggregate([
                {
                    $match: {
                        completed_date: { $gte: twelveMonthsAgo },
                        cost: { $ne: null }
                    }
                },
                { $group: { _id: null, total: { $sum: '$cost' } } }
            ])
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

module.exports = router;