// routes/incidents.js - VERSIÓN MONGODB
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Incident = require('../models/Incidents');

const router = express.Router();

// Función para generar código de incidencia
const generateIncidentCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INC-${year}${month}${day}-${random}`;
};

// Obtener todas las incidencias con filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, priority, asset_id, assigned_to } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (asset_id) query.asset_id = asset_id;
        if (assigned_to) query.assigned_to = assigned_to;

        const incidents = await Incident.find(query)
            .populate('asset_id', 'name asset_code')
            .populate('reported_by', 'full_name')
            .populate('assigned_to', 'full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Incident.countDocuments(query);

        res.json({
            incidents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener incidencias:', error);
        res.status(500).json({ message: 'Error al obtener incidencias' });
    }
});

// Obtener una incidencia específica
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate('asset_id', 'name asset_code')
            .populate('reported_by', 'full_name')
            .populate('assigned_to', 'full_name');

        if (!incident) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        res.json({ incident });
    } catch (error) {
        console.error('Error al obtener incidencia:', error);
        res.status(500).json({ message: 'Error al obtener incidencia' });
    }
});

// Crear nueva incidencia
router.post('/', authenticateToken, [
    body('title').notEmpty().withMessage('Título es requerido'),
    body('description').notEmpty().withMessage('Descripción es requerida'),
    body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Prioridad inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const incident_code = generateIncidentCode();

        const incident = new Incident({
            incident_code,
            title: req.body.title,
            description: req.body.description,
            asset_id: req.body.asset_id,
            priority: req.body.priority || 'medium',
            reported_by: req.user.id,
            assigned_to: req.body.assigned_to,
            status: 'open'
        });

        await incident.save();

        res.status(201).json({
            message: 'Incidencia creada exitosamente',
            incident
        });
    } catch (error) {
        console.error('Error al crear incidencia:', error);
        res.status(500).json({ message: 'Error al crear incidencia' });
    }
});

// Actualizar incidencia
router.put('/:id', authenticateToken, [
    body('title').notEmpty().withMessage('Título es requerido'),
    body('description').notEmpty().withMessage('Descripción es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updateData = {
            title: req.body.title,
            description: req.body.description,
            priority: req.body.priority,
            status: req.body.status,
            assigned_to: req.body.assigned_to,
            solution: req.body.solution
        };

        // Si se está resolviendo, agregar fecha
        if (req.body.status === 'resolved' || req.body.status === 'closed') {
            updateData.resolved_date = new Date();
        }

        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!incident) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        res.json({ message: 'Incidencia actualizada exitosamente', incident });
    } catch (error) {
        console.error('Error al actualizar incidencia:', error);
        res.status(500).json({ message: 'Error al actualizar incidencia' });
    }
});

// Asignar incidencia
router.put('/:id/assign', authenticateToken, [
    body('assigned_to').notEmpty().withMessage('Usuario asignado requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                assigned_to: req.body.assigned_to,
                status: 'assigned'
            },
            { new: true }
        );

        if (!incident) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        res.json({ message: 'Incidencia asignada exitosamente' });
    } catch (error) {
        console.error('Error al asignar incidencia:', error);
        res.status(500).json({ message: 'Error al asignar incidencia' });
    }
});

// Resolver incidencia
router.put('/:id/resolve', authenticateToken, [
    body('solution').notEmpty().withMessage('Solución es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                solution: req.body.solution,
                status: 'resolved',
                resolved_date: new Date()
            },
            { new: true }
        );

        if (!incident) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        res.json({ message: 'Incidencia resuelta exitosamente' });
    } catch (error) {
        console.error('Error al resolver incidencia:', error);
        res.status(500).json({ message: 'Error al resolver incidencia' });
    }
});

// Obtener estadísticas de incidencias
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = {
            total: [{ count: await Incident.countDocuments() }],
            byStatus: await Incident.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            byPriority: await Incident.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            open: [{ 
                count: await Incident.countDocuments({ 
                    status: { $in: ['open', 'assigned', 'in_progress'] } 
                }) 
            }],
            resolved: [{ count: await Incident.countDocuments({ status: 'resolved' }) }],
            avgResolutionTime: await Incident.aggregate([
                { $match: { resolved_date: { $ne: null } } },
                {
                    $project: {
                        duration: {
                            $divide: [
                                { $subtract: ['$resolved_date', '$reported_date'] },
                                1000 * 60 * 60 // Convertir a horas
                            ]
                        }
                    }
                },
                { $group: { _id: null, avg_hours: { $avg: '$duration' } } }
            ])
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

module.exports = router;