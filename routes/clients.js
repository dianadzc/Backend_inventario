// routes/clients.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Client = require('../models/Client');

const router = express.Router();

// Obtener todos los clientes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const clients = await Client.find({ active: true })
            .sort({ name: 1 });

        res.json({ clients });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
});

// Crear nuevo cliente
router.post('/', authenticateToken, [
    body('name').notEmpty().withMessage('Nombre del cliente es requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verificar si ya existe
        const existing = await Client.findOne({ name: req.body.name });
        if (existing) {
            return res.status(400).json({ message: 'El cliente ya existe' });
        }

        const client = new Client({
            name: req.body.name,
            rfc: req.body.rfc || '',
            email: req.body.email || '',
            phone: req.body.phone || ''
        });

        await client.save();

        res.status(201).json({
            message: 'Cliente creado exitosamente',
            client
        });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ message: 'Error al crear cliente' });
    }

    // Eliminar cliente
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const client = await Client.findByIdAndDelete(req.params.id);

            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            res.json({ message: 'Cliente eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            res.status(500).json({ message: 'Error al eliminar cliente' });
        }
    });

});

module.exports = router;