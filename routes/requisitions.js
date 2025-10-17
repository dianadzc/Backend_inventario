// routes/requisitions.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Requisition = require('../models/requesition');

const router = express.Router();

// Función para generar código de requisición
const generateRequisitionCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REQ-${year}${month}${day}-${random}`;
};

// Función para convertir número a letras (mexicano)
const numeroALetras = (num) => {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (num === 0) return 'CERO';
    if (num === 100) return 'CIEN';

    let resultado = '';
    const partes = num.toString().split('.');
    const entero = parseInt(partes[0]);
    const decimal = partes[1] ? parseInt(partes[1].padEnd(2, '0').substr(0, 2)) : 0;

    // Millones
    if (entero >= 1000000) {
        const millones = Math.floor(entero / 1000000);
        resultado += millones === 1 ? 'UN MILLÓN ' : numeroALetras(millones) + ' MILLONES ';
    }

    // Miles
    const miles = Math.floor((entero % 1000000) / 1000);
    if (miles > 0) {
        resultado += miles === 1 ? 'MIL ' : numeroALetras(miles) + ' MIL ';
    }

    // Centenas, decenas y unidades
    const resto = entero % 1000;
    if (resto > 0) {
        const cent = Math.floor(resto / 100);
        const dec = Math.floor((resto % 100) / 10);
        const uni = resto % 10;

        if (cent > 0) {
            resultado += centenas[cent] + ' ';
        }

        if (dec === 1 && uni > 0) {
            resultado += especiales[uni] + ' ';
        } else {
            if (dec > 0) resultado += decenas[dec] + ' ';
            if (uni > 0) resultado += (dec > 2 ? 'Y ' : '') + unidades[uni] + ' ';
        }
    }

    // Agregar centavos
    return `${resultado.trim()} ${decimal > 0 ? decimal.toString().padStart(2, '0') : '00'}/100 MN`;
};

// Obtener todas las requisiciones
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) query.status = status;

        const requisitions = await Requisition.find(query)
            .populate('requested_by', 'full_name')
            .populate('approved_by', 'full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Requisition.countDocuments(query);

        res.json({
            requisitions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener requisiciones:', error);
        res.status(500).json({ message: 'Error al obtener requisiciones' });
    }
});

// Obtener una requisición específica
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const requisition = await Requisition.findById(req.params.id)
            .populate('requested_by', 'full_name department')
            .populate('approved_by', 'full_name');

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada' });
        }

        res.json({ requisition });
    } catch (error) {
        console.error('Error al obtener requisición:', error);
        res.status(500).json({ message: 'Error al obtener requisición' });
    }
});

// Crear nueva requisición
router.post('/', authenticateToken, [
    body('request_type').isIn(['transferencia', 'pago_tarjeta', 'efectivo', 'pago_linea']).withMessage('Tipo de solicitud inválido'),
    body('amount').isNumeric().withMessage('Monto debe ser un número'),
    body('currency').isIn(['MXN', 'USD']).withMessage('Moneda inválida'),
    body('payable_to').notEmpty().withMessage('A favor de es requerido'),
    body('concept').notEmpty().withMessage('Concepto es requerido'),
    body('request_date').optional().isISO8601().toDate()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const requisition_code = generateRequisitionCode();
        const amount_in_words = numeroALetras(req.body.amount);

        const requisition = new Requisition({
            requisition_code,
            request_type: req.body.request_type,
            amount: req.body.amount,
            currency: req.body.currency,
            amount_in_words,
            payable_to: req.body.payable_to,
            concept: req.body.concept,
            request_date: req.body.request_date || new Date(),
            department: 'SISTEMAS',
            requested_by: req.user.id,
            status: 'pending'
        });

        await requisition.save();

        res.status(201).json({
            message: 'Requisición creada exitosamente',
            requisition
        });
    } catch (error) {
        console.error('Error al crear requisición:', error);
        res.status(500).json({ message: 'Error al crear requisición' });
    }
});

// Editar requisición
router.put('/:id', authenticateToken, [
    body('amount').optional().isNumeric().withMessage('Monto debe ser numérico'),
    body('payable_to').optional().notEmpty().withMessage('A favor de es requerido'),
    body('concept').optional().notEmpty().withMessage('Concepto es requerido'),
    body('request_date').optional().isISO8601().toDate()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const requisition = await Requisition.findById(req.params.id);

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada' });
        }

        // Solo permitir editar si está pendiente
        if (requisition.status !== 'pending') {
            return res.status(400).json({ 
                message: 'Solo se pueden editar requisiciones pendientes' 
            });
        }

        // Actualizar campos
        if (req.body.request_type) requisition.request_type = req.body.request_type;
        if (req.body.amount) requisition.amount = req.body.amount;
        if (req.body.currency) requisition.currency = req.body.currency;
        if (req.body.payable_to) requisition.payable_to = req.body.payable_to;
        if (req.body.concept) requisition.concept = req.body.concept;

        await requisition.save();

        const populatedRequisition = await Requisition.findById(requisition._id)
            .populate('requested_by', 'username full_name email');

        res.json({
            message: 'Requisición actualizada exitosamente',
            requisition: populatedRequisition
        });
    } catch (error) {
        console.error('Error al actualizar requisición:', error);
        res.status(500).json({ message: 'Error al actualizar requisición' });
    }
});

// Aprobar/Rechazar requisición
router.put('/:id/approve', authenticateToken, [
    body('approved').isBoolean().withMessage('Estado de aprobación requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { approved, notes } = req.body;
        const status = approved ? 'approved' : 'rejected';

        const requisition = await Requisition.findOneAndUpdate(
            { _id: req.params.id, status: 'pending' },
            {
                status,
                approved_by: req.user.id,
                approval_date: new Date(),
                notes: notes || ''
            },
            { new: true }
        );

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada o ya procesada' });
        }

        res.json({
            message: `Requisición ${approved ? 'aprobada' : 'rechazada'} exitosamente`
        });
    } catch (error) {
        console.error('Error al aprobar requisición:', error);
        res.status(500).json({ message: 'Error al aprobar requisición' });
    }
});

// Editar requisición
router.put('/:id', authenticateToken, [
    body('amount').optional().isNumeric().withMessage('Monto debe ser numérico'),
    body('payable_to').optional().notEmpty().withMessage('A favor de es requerido'),
    body('concept').optional().notEmpty().withMessage('Concepto es requerido'),
    body('request_date').optional().isISO8601().toDate()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const requisition = await Requisition.findById(req.params.id);

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada' });
        }

        // Solo permitir editar si está pendiente
        if (requisition.status !== 'pending') {
            return res.status(400).json({ 
                message: 'Solo se pueden editar requisiciones pendientes' 
            });
        }

        // Actualizar campos
        if (req.body.request_type) requisition.request_type = req.body.request_type;
        if (req.body.amount) requisition.amount = req.body.amount;
        if (req.body.currency) requisition.currency = req.body.currency;
        if (req.body.payable_to) requisition.payable_to = req.body.payable_to;
        if (req.body.concept) requisition.concept = req.body.concept;

        await requisition.save();

        const populatedRequisition = await Requisition.findById(requisition._id)
            .populate('requested_by', 'username full_name email');

        res.json({
            message: 'Requisición actualizada exitosamente',
            requisition: populatedRequisition
        });
    } catch (error) {
        console.error('Error al actualizar requisición:', error);
        res.status(500).json({ message: 'Error al actualizar requisición' });
    }
});

// Generar PDF de requisición
router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const requisition = await Requisition.findById(req.params.id)
            .populate('requested_by', 'full_name')
            .populate('approved_by', 'full_name');

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada' });
        }

        // Retornar datos para generar PDF en el frontend
        res.json({
            requisition,
            pdfData: {
                title: `Solicitud de ${requisition.request_type.toUpperCase()}`,
                hotel: 'BEACHSCAPE KIN HA VILLAS & SUITES',
                date: new Date().toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            }
        });
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ message: 'Error al generar PDF' });
    }
});

// Obtener estadísticas
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const stats = {
            total: await Requisition.countDocuments(),
            byStatus: await Requisition.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            byType: await Requisition.aggregate([
                { $group: { _id: '$request_type', count: { $sum: 1 } } }
            ]),
            pending: await Requisition.countDocuments({ status: 'pending' }),
            approved: await Requisition.countDocuments({ status: 'approved' }),
            thisMonth: await Requisition.countDocuments({
                createdAt: { $gte: startOfMonth }
            }),
            totalAmount: await Requisition.aggregate([
                { $match: { status: { $in: ['approved', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// Eliminar requisición
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const requisition = await Requisition.findById(req.params.id);

        if (!requisition) {
            return res.status(404).json({ message: 'Requisición no encontrada' });
        }

        await Requisition.findByIdAndDelete(req.params.id);

        res.json({ 
            message: 'Requisición eliminada exitosamente',
            id: req.params.id 
        });
    } catch (error) {
        console.error('Error al eliminar requisición:', error);
        res.status(500).json({ message: 'Error al eliminar requisición' });
    }
});
module.exports = router;