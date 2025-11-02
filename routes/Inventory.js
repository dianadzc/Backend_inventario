// routes/inventory.js - VERSIÓN MONGODB ACTUALIZADA
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const Asset = require('../models/Asset');
const AssetCategory = require('../models/AssetCategory');
const TypeCatalog = require('../models/TypeCatalog');

const router = express.Router();

// Obtener todos los activos con filtros y paginación
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, category, status, search } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (category) {
            query.category_id = category;
        }

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { asset_code: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { serial_number: { $regex: search, $options: 'i' } }
            ];
        }

        const assets = await Asset.find(query)
            .populate('category_id', 'name')
            .populate('responsible_user_id', 'full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Asset.countDocuments(query);

        res.json({
            assets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener activos:', error);
        res.status(500).json({ message: 'Error al obtener activos' });
    }
});

// Obtener un activo específico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id)
            .populate('category_id', 'name')
            .populate('responsible_user_id', 'full_name department');

        if (!asset) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ asset });
    } catch (error) {
        console.error('Error al obtener activo:', error);
        res.status(500).json({ message: 'Error al obtener activo' });
    }
});

// ⭐ Crear nuevo activo - ACTUALIZADO
router.post('/', authenticateToken, [
    body('name').notEmpty().withMessage('Nombre del activo es requerido'),
    body('asset_code').notEmpty().withMessage('Código del activo es requerido'),
    body('category_id').optional().isMongoId().withMessage('Categoría válida es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verificar que el código no exista
        const existing = await Asset.findOne({ asset_code: req.body.asset_code });
        if (existing) {
            return res.status(400).json({ message: 'El código del activo ya existe' });
        }

        // ⭐ Mapear campos correctamente
        const assetData = {
            name: req.body.name,
            description: req.body.description || '',
            type: req.body.type || 'Otro', // ⭐ NUEVO
            asset_code: req.body.asset_code,
            category_id: req.body.category_id || undefined,
            brand: req.body.brand || '',
            serial_number: req.body.serial_number || '', // ⭐ NUEVO
            purchase_date: req.body.purchase_date || new Date(),
            purchase_price: parseFloat(req.body.purchase_price) || 0,
            supplier: req.body.supplier || '',
            location: req.body.location || 'Almacén',
            status: req.body.status || 'active',
            responsible_user_id: req.body.responsible_user_id || undefined,
            warranty_expiry: req.body.warranty_expiry || undefined,
            notes: req.body.notes || ''
        };

        console.log('📦 Creando activo con datos:', assetData);

        const asset = new Asset(assetData);
        await asset.save();

        res.status(201).json({
            message: 'Activo creado exitosamente',
            asset
        });
    } catch (error) {
        console.error('Error al crear activo:', error);
        res.status(500).json({ message: 'Error al crear activo', error: error.message });
    }
});

// ⭐ Actualizar activo - ACTUALIZADO
router.put('/:id', authenticateToken, [
    body('name').notEmpty().withMessage('Nombre del activo es requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ⭐ Mapear campos correctamente
        const updateData = {
            name: req.body.name,
            description: req.body.description || '',
            type: req.body.type || 'Otro', // ⭐ NUEVO
            status: req.body.status || 'active',
            purchase_price: parseFloat(req.body.purchase_price) || 0,
            brand: req.body.brand || '',
            serial_number: req.body.serial_number || '', // ⭐ NUEVO
            location: req.body.location,
            notes: req.body.notes || ''
        };

        // Solo actualizar campos que fueron enviados
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        console.log('🔄 Actualizando activo con datos:', updateData);

        const asset = await Asset.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!asset) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Activo actualizado exitosamente', asset });
    } catch (error) {
        console.error('Error al actualizar activo:', error);
        res.status(500).json({ message: 'Error al actualizar activo' });
    }
});

// Eliminar activo (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const asset = await Asset.findByIdAndUpdate(
            req.params.id,
            { status: 'inactive' },
            { new: true }
        );

        if (!asset) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Activo eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar activo:', error);
        res.status(500).json({ message: 'Error al eliminar activo' });
    }
});

// Obtener categorías
router.get('/categories/all', authenticateToken, async (req, res) => {
    try {
        const categories = await AssetCategory.find().sort({ name: 1 });
        res.json({ categories });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
});

// Crear nueva categoría
router.post('/categories', authenticateToken, authorizeRole(['admin']), [
    body('name').notEmpty().withMessage('Nombre de la categoría es requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const category = new AssetCategory(req.body);
        await category.save();

        res.status(201).json({
            message: 'Categoría creada exitosamente',
            category
        });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ message: 'Error al crear categoría' });
    }
});

// Obtener estadísticas del inventario
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = {
            total: await Asset.countDocuments({ status: { $ne: 'inactive' } }),
            byStatus: await Asset.aggregate([
                { $match: { status: { $ne: 'inactive' } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            byCategory: await Asset.aggregate([
                { $match: { status: { $ne: 'inactive' } } },
                {
                    $lookup: {
                        from: 'assetcategories',
                        localField: 'category_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                { $group: { _id: '$category.name', count: { $sum: 1 } } }
            ]),
            expiredWarranty: await Asset.countDocuments({
                warranty_expiry: { $lt: new Date() },
                status: 'active'
            }),
            expiringWarranty: await Asset.countDocuments({
                warranty_expiry: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                status: 'active'
            })
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// Backend/routes/inventory.js - AGREGAR AL FINAL (antes de module.exports)

const AssetCatalog = require('../models/AssetCatalog');

// ========== CATÁLOGO DE ACTIVOS ==========

// Obtener todos los nombres de activos del catálogo
router.get('/catalog/asset-names', authenticateToken, async (req, res) => {
  try {
    const assetNames = await AssetCatalog.find().sort({ name: 1 });
    res.json(assetNames);
  } catch (error) {
    console.error('Error al obtener catálogo de activos:', error);
    res.status(500).json({ message: 'Error al obtener catálogo de activos' });
  }
});

// Crear nuevo nombre de activo en el catálogo
router.post('/catalog/asset-names', authenticateToken, [
  body('name').notEmpty().withMessage('Nombre del activo es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assetName = new AssetCatalog({
      name: req.body.name.trim(),
      description: req.body.description || ''
    });

    await assetName.save();

    res.status(201).json({
      message: 'Nombre de activo agregado al catálogo',
      assetName
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Este nombre de activo ya existe' });
    }
    console.error('Error al crear nombre de activo:', error);
    res.status(500).json({ message: 'Error al crear nombre de activo' });
  }
});

// Obtener todos los tipos del catálogo
router.get('/catalog/types', authenticateToken, async (req, res) => {
  try {
    const types = await TypeCatalog.find().sort({ name: 1 });
    res.json(types);
  } catch (error) {
    console.error('Error al obtener catálogo de tipos:', error);
    res.status(500).json({ message: 'Error al obtener catálogo de tipos' });
  }
});

// Crear nuevo tipo en el catálogo
router.post('/catalog/types', authenticateToken, [
  body('name').notEmpty().withMessage('Nombre del tipo es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const type = new TypeCatalog({
      name: req.body.name.trim(),
      description: req.body.description || ''
    });

    await type.save();

    res.status(201).json({
      message: 'Tipo agregado al catálogo',
      type
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Este tipo ya existe' });
    }
    console.error('Error al crear tipo:', error);
    res.status(500).json({ message: 'Error al crear tipo' });
  }
});

module.exports = router;
