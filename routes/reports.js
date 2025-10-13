// routes/reports.js - VERSIÓN MONGODB
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Incident = require('../models/Incidents');
const Maintenance = require('../models/Maintenance');
const ResponsiveForm = require('../models/ResponsiveForm');

const router = express.Router();

// Dashboard general con estadísticas principales
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const dashboard = {
            // Inventario
            totalAssets: await Asset.countDocuments({ status: { $ne: 'inactive' } }),
            assetsByCategory: await Asset.aggregate([
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
                {
                    $group: {
                        _id: '$category.name',
                        count: { $sum: 1 }
                    }
                }
            ]),
            assetsWithoutResponsible: await Asset.countDocuments({
                responsible_user_id: null,
                status: 'active'
            }),
            expiredWarranties: await Asset.countDocuments({
                warranty_expiry: { $lt: today },
                status: 'active'
            }),

            // Incidencias
            totalIncidents: await Incident.countDocuments(),
            openIncidents: await Incident.countDocuments({
                status: { $in: ['open', 'assigned', 'in_progress'] }
            }),
            incidentsByPriority: await Incident.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),

            // Mantenimientos
            totalMaintenances: await Maintenance.countDocuments(),
            upcomingMaintenances: await Maintenance.countDocuments({
                scheduled_date: { $gte: today, $lte: thirtyDaysFromNow },
                status: 'scheduled'
            }),
            overdueMaintenances: await Maintenance.countDocuments({
                scheduled_date: { $lt: today },
                status: 'scheduled'
            }),

            // Formatos responsivos
            pendingForms: await ResponsiveForm.countDocuments({ status: 'pending' }),

            // Requisiciones (pendiente de implementar)
            pendingRequisitions: 0,
            approvedRequisitionsValue: 0
        };

        res.json({ dashboard });
    } catch (error) {
        console.error('Error al obtener dashboard:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' });
    }
});

// Reporte de inventario con filtros
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const { category, status, responsible, dateFrom, dateTo } = req.query;

        let query = {};

        if (category) query.category_id = category;
        if (status) query.status = status;
        if (responsible) query.responsible_user_id = responsible;
        if (dateFrom) query.createdAt = { $gte: new Date(dateFrom) };
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { ...query.createdAt, $lte: endDate };
        }

        const assets = await Asset.find(query)
            .populate('category_id', 'name')
            .populate('responsible_user_id', 'full_name department')
            .sort({ createdAt: -1 });

        // Calcular resumen
        const summary = {
            totalAssets: assets.length,
            byCategory: {},
            byStatus: {},
            totalValue: 0
        };

        assets.forEach(asset => {
            const catName = asset.category_id?.name || 'Sin categoría';
            summary.byCategory[catName] = (summary.byCategory[catName] || 0) + 1;
            summary.byStatus[asset.status] = (summary.byStatus[asset.status] || 0) + 1;
            summary.totalValue += asset.purchase_price || 0;
        });

        const reportData = {
            title: 'Reporte de Inventario',
            generatedAt: new Date().toISOString(),
            filters: { category, status, responsible, dateFrom, dateTo },
            data: assets,
            summary
        };

        res.json(reportData);
    } catch (error) {
        console.error('Error al generar reporte de inventario:', error);
        res.status(500).json({ message: 'Error al generar reporte de inventario' });
    }
});

// Reporte de incidencias
router.get('/incidents', authenticateToken, async (req, res) => {
    try {
        const { status, priority, asset_id, dateFrom, dateTo } = req.query;

        let query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (asset_id) query.asset_id = asset_id;
        if (dateFrom) query.reported_date = { $gte: new Date(dateFrom) };
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            query.reported_date = { ...query.reported_date, $lte: endDate };
        }

        const incidents = await Incident.find(query)
            .populate('asset_id', 'name asset_code')
            .populate('reported_by', 'full_name')
            .populate('assigned_to', 'full_name')
            .sort({ reported_date: -1 });

        // Calcular tiempo de resolución
        const incidentsWithTime = incidents.map(inc => {
            let resolution_hours = null;
            if (inc.resolved_date) {
                const diff = inc.resolved_date - inc.reported_date;
                resolution_hours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
            }
            return { ...inc.toObject(), resolution_hours };
        });

        // Calcular resumen
        const resolvedIncidents = incidentsWithTime.filter(i => i.resolution_hours !== null);
        const avgResolutionTime = resolvedIncidents.length > 0
            ? resolvedIncidents.reduce((sum, i) => sum + i.resolution_hours, 0) / resolvedIncidents.length
            : 0;

        const summary = {
            totalIncidents: incidents.length,
            byStatus: {},
            byPriority: {},
            averageResolutionTime: Math.round(avgResolutionTime * 100) / 100,
            resolvedCount: resolvedIncidents.length
        };

        incidents.forEach(inc => {
            summary.byStatus[inc.status] = (summary.byStatus[inc.status] || 0) + 1;
            summary.byPriority[inc.priority] = (summary.byPriority[inc.priority] || 0) + 1;
        });

        const reportData = {
            title: 'Reporte de Incidencias',
            generatedAt: new Date().toISOString(),
            filters: { status, priority, asset_id, dateFrom, dateTo },
            data: incidentsWithTime,
            summary
        };

        res.json(reportData);
    } catch (error) {
        console.error('Error al generar reporte de incidencias:', error);
        res.status(500).json({ message: 'Error al generar reporte de incidencias' });
    }
});

// Reporte de mantenimientos
router.get('/maintenance', authenticateToken, async (req, res) => {
    try {
        const { type, status, asset_id, dateFrom, dateTo } = req.query;

        let query = {};

        if (type) query.type = type;
        if (status) query.status = status;
        if (asset_id) query.asset_id = asset_id;
        if (dateFrom) query.scheduled_date = { $gte: new Date(dateFrom) };
        if (dateTo) {
            const endDate = new Date(dateTo);
            query.scheduled_date = { ...query.scheduled_date, $lte: endDate };
        }

        const maintenances = await Maintenance.find(query)
            .populate('asset_id', 'name asset_code')
            .populate('technician_id', 'full_name')
            .sort({ scheduled_date: -1 });

        // Calcular resumen
        const summary = {
            totalMaintenances: maintenances.length,
            byType: {},
            byStatus: {},
            totalCost: 0,
            completedCount: 0
        };

        maintenances.forEach(mnt => {
            summary.byType[mnt.type] = (summary.byType[mnt.type] || 0) + 1;
            summary.byStatus[mnt.status] = (summary.byStatus[mnt.status] || 0) + 1;
            summary.totalCost += mnt.cost || 0;
            if (mnt.status === 'completed') summary.completedCount++;
        });

        const reportData = {
            title: 'Reporte de Mantenimientos',
            generatedAt: new Date().toISOString(),
            filters: { type, status, asset_id, dateFrom, dateTo },
            data: maintenances,
            summary
        };

        res.json(reportData);
    } catch (error) {
        console.error('Error al generar reporte de mantenimientos:', error);
        res.status(500).json({ message: 'Error al generar reporte de mantenimientos' });
    }
});

// Reporte de formatos responsivos
router.get('/responsive-forms', authenticateToken, async (req, res) => {
    try {
        const { status, asset_id, dateFrom, dateTo } = req.query;

        let query = {};

        if (status) query.status = status;
        if (asset_id) query.asset_id = asset_id;
        if (dateFrom) query.transfer_date = { $gte: new Date(dateFrom) };
        if (dateTo) {
            const endDate = new Date(dateTo);
            query.transfer_date = { ...query.transfer_date, $lte: endDate };
        }

        const forms = await ResponsiveForm.find(query)
            .populate('asset_id', 'name asset_code')
            .populate('previous_responsible_id', 'full_name department')
            .populate('new_responsible_id', 'full_name department')
            .populate('approved_by', 'full_name')
            .sort({ transfer_date: -1 });

        // Calcular resumen
        const summary = {
            totalForms: forms.length,
            byStatus: {},
            approvedCount: 0,
            pendingCount: 0
        };

        forms.forEach(form => {
            summary.byStatus[form.status] = (summary.byStatus[form.status] || 0) + 1;
            if (form.status === 'approved') summary.approvedCount++;
            if (form.status === 'pending') summary.pendingCount++;
        });

        const reportData = {
            title: 'Reporte de Formatos Responsivos',
            generatedAt: new Date().toISOString(),
            filters: { status, asset_id, dateFrom, dateTo },
            data: forms,
            summary
        };

        res.json(reportData);
    } catch (error) {
        console.error('Error al generar reporte de formatos responsivos:', error);
        res.status(500).json({ message: 'Error al generar reporte de formatos responsivos' });
    }
});

// Reporte de requisiciones (pendiente de implementar)
router.get('/requisitions', authenticateToken, async (req, res) => {
    try {
        const reportData = {
            title: 'Reporte de Requisiciones',
            generatedAt: new Date().toISOString(),
            message: 'Funcionalidad en desarrollo',
            data: [],
            summary: {
                totalRequisitions: 0,
                byStatus: {},
                byType: {},
                totalEstimatedCost: 0,
                approvedValue: 0
            }
        };

        res.json(reportData);
    } catch (error) {
        console.error('Error al generar reporte de requisiciones:', error);
        res.status(500).json({ message: 'Error al generar reporte de requisiciones' });
    }
});

// Reporte de actividad de usuarios
router.get('/user-activity', authenticateToken, async (req, res) => {
    try {
        const { user_id, dateFrom, dateTo } = req.query;

        if (!user_id) {
            return res.status(400).json({ message: 'ID de usuario requerido' });
        }

        let dateQuery = {};
        if (dateFrom) dateQuery.$gte = new Date(dateFrom);
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            dateQuery.$lte = endDate;
        }

        const activity = {
            incidents_reported: await Incident.countDocuments({
                reported_by: user_id,
                ...(Object.keys(dateQuery).length > 0 && { reported_date: dateQuery })
            }),
            incidents_assigned: await Incident.countDocuments({
                assigned_to: user_id,
                ...(Object.keys(dateQuery).length > 0 && { reported_date: dateQuery })
            }),
            maintenances_assigned: await Maintenance.countDocuments({
                technician_id: user_id,
                ...(Object.keys(dateQuery).length > 0 && { scheduled_date: dateQuery })
            }),
            requisitions_made: 0, // Pendiente
            forms_approved: await ResponsiveForm.countDocuments({
                approved_by: user_id,
                ...(Object.keys(dateQuery).length > 0 && { createdAt: dateQuery })
            })
        };

        res.json({
            title: 'Reporte de Actividad de Usuario',
            user_id,
            dateFrom,
            dateTo,
            activity
        });
    } catch (error) {
        console.error('Error al generar reporte de actividad:', error);
        res.status(500).json({ message: 'Error al generar reporte de actividad' });
    }
});

module.exports = router;