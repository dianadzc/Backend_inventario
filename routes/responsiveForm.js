// routes/responsiveForms.js - VERSIÓN MONGODB
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const ResponsiveForm = require('../models/ResponsiveForm');
const Asset = require('../models/Asset');

const router = express.Router();

// Función para generar código de formato responsivo
const generateFormCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FR-${year}${month}${day}-${random}`;
};

// Obtener todos los formatos responsivos con filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, asset_id, new_responsible_id } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) query.status = status;
        if (asset_id) query.asset_id = asset_id;
        if (new_responsible_id) query.new_responsible_id = new_responsible_id;

        const forms = await ResponsiveForm.find(query)
            .populate('asset_id', 'name asset_code brand model serial_number')
            .populate('previous_responsible_id', 'full_name department')
            .populate('new_responsible_id', 'full_name department')
            .populate('approved_by', 'full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ResponsiveForm.countDocuments(query);

        res.json({
            forms,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener formatos responsivos:', error);
        res.status(500).json({ message: 'Error al obtener formatos responsivos' });
    }
});

// Obtener un formato responsivo específico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const form = await ResponsiveForm.findById(req.params.id)
            .populate('asset_id', 'name asset_code brand model serial_number description')
            .populate('previous_responsible_id', 'full_name department')
            .populate('new_responsible_id', 'full_name department')
            .populate('approved_by', 'full_name');

        if (!form) {
            return res.status(404).json({ message: 'Formato responsivo no encontrado' });
        }

        res.json({ form });
    } catch (error) {
        console.error('Error al obtener formato responsivo:', error);
        res.status(500).json({ message: 'Error al obtener formato responsivo' });
    }
});

// Crear nuevo formato responsivo
router.post('/', authenticateToken, [
    body('asset_id').notEmpty().withMessage('Activo válido es requerido'),
    body('new_responsible_id').notEmpty().withMessage('Nuevo responsable válido es requerido'),
    body('transfer_date').isISO8601().withMessage('Fecha de transferencia válida es requerida'),
    body('reason').notEmpty().withMessage('Razón de la transferencia es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const form_code = generateFormCode();

        // Obtener el responsable actual del activo
        const asset = await Asset.findById(req.body.asset_id);
        if (!asset) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        const form = new ResponsiveForm({
            form_code,
            asset_id: req.body.asset_id,
            previous_responsible_id: asset.responsible_user_id,
            new_responsible_id: req.body.new_responsible_id,
            transfer_date: req.body.transfer_date,
            reason: req.body.reason,
            conditions: req.body.conditions,
            observations: req.body.observations,
            status: 'pending'
        });

        await form.save();

        res.status(201).json({
            message: 'Formato responsivo creado exitosamente',
            form
        });
    } catch (error) {
        console.error('Error al crear formato responsivo:', error);
        res.status(500).json({ message: 'Error al crear formato responsivo' });
    }
});

// Aprobar formato responsivo
router.put('/:id/approve', authenticateToken, [
    body('approved').isBoolean().withMessage('Estado de aprobación requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { approved, comments } = req.body;
        const status = approved ? 'approved' : 'rejected';

        // Actualizar el formato responsivo
        const form = await ResponsiveForm.findOneAndUpdate(
            { _id: req.params.id, status: 'pending' },
            {
                status,
                approved_by: req.user.id,
                observations: comments || form.observations
            },
            { new: true }
        );

        if (!form) {
            return res.status(404).json({ message: 'Formato no encontrado o ya procesado' });
        }

        // Si fue aprobado, actualizar el responsable del activo
        if (approved) {
            await Asset.findByIdAndUpdate(
                form.asset_id,
                { responsible_user_id: form.new_responsible_id }
            );
        }

        res.json({
            message: `Formato responsivo ${approved ? 'aprobado' : 'rechazado'} exitosamente`
        });
    } catch (error) {
        console.error('Error al aprobar formato responsivo:', error);
        res.status(500).json({ message: 'Error al aprobar formato responsivo' });
    }
});

// Obtener historial de responsabilidades de un activo
router.get('/asset/:assetId/history', authenticateToken, async (req, res) => {
    try {
        const history = await ResponsiveForm.find({
            asset_id: req.params.assetId,
            status: 'approved'
        })
            .populate('previous_responsible_id', 'full_name department')
            .populate('new_responsible_id', 'full_name department')
            .populate('approved_by', 'full_name')
            .sort({ transfer_date: -1 });

        res.json({ history });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ message: 'Error al obtener historial de responsabilidades' });
    }
});

// Obtener formatos pendientes de aprobación
router.get('/pending/approval', authenticateToken, async (req, res) => {
    try {
        const pendingForms = await ResponsiveForm.find({ status: 'pending' })
            .populate('asset_id', 'name asset_code')
            .populate('previous_responsible_id', 'full_name')
            .populate('new_responsible_id', 'full_name')
            .sort({ createdAt: 1 });

        res.json({ pendingForms });
    } catch (error) {
        console.error('Error al obtener formatos pendientes:', error);
        res.status(500).json({ message: 'Error al obtener formatos pendientes' });
    }
});

// Generar PDF del formato responsivo
router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const form = await ResponsiveForm.findById(req.params.id)
            .populate('asset_id', 'name asset_code brand model serial_number description')
            .populate('previous_responsible_id', 'full_name department')
            .populate('new_responsible_id', 'full_name department')
            .populate('approved_by', 'full_name');

        if (!form) {
            return res.status(404).json({ message: 'Formato responsivo no encontrado' });
        }

        // Aquí se generaría el PDF con los datos del formato
        // Por ahora retornamos los datos para generar el PDF en el frontend
        res.json({
            form,
            pdfData: {
                title: `Formato Responsivo ${form.form_code}`,
                hotel: 'Beachscape Kin Ha Villas & Suites',
                address: 'Blvd. Kukulcán Km 8.5, Zona Hotelera, Cancún, Quintana Roo',
                date: new Date().toLocaleDateString('es-MX')
            }
        });
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ message: 'Error al generar PDF' });
    }
});

// Obtener estadísticas de formatos responsivos
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const stats = {
            total: [{ count: await ResponsiveForm.countDocuments() }],
            byStatus: await ResponsiveForm.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            pending: [{ count: await ResponsiveForm.countDocuments({ status: 'pending' }) }],
            approved: [{ count: await ResponsiveForm.countDocuments({ status: 'approved' }) }],
            rejected: [{ count: await ResponsiveForm.countDocuments({ status: 'rejected' }) }],
            thisMonth: [{
                count: await ResponsiveForm.countDocuments({
                    createdAt: { $gte: startOfMonth }
                })
            }]
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

module.exports = router;