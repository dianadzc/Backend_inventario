// server.js - VERSIÓN MONGODB
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const incidentsRoutes = require('./routes/incidents');
const maintenanceRoutes = require('./routes/maintenance');
const responsiveFormsRoutes = require('./routes/responsiveForm');
const reportsRoutes = require('./routes/reports');
const requisitionsRoutes = require('./routes/requisitions');


const app = express();
const PORT = process.env.PORT || 5000;

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/responsive-forms', responsiveFormsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/requisitions', requisitionsRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Servidor SIAF ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 ${process.env.APP_NAME}`);
    console.log(`🏨 ${process.env.COMPANY_NAME}`);
    console.log(`📍 ${process.env.COMPANY_ADDRESS}`);
    console.log(`${'='.repeat(60)}\n`);
});