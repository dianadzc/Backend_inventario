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
const clientsRoutes = require('./routes/clients');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar a MongoDB
connectDB();

//  CONFIGURACIÓN CORS COMPLETA
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'http://127.0.0.1:5173'
        ];
        
        // Permitir requests sin origin (como Postman o mismo servidor)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 horas
};

app.use(generalLimiter);

app.use(cors(corsOptions));

// Manejar preflight requests explícitamente
app.options('*', cors(corsOptions));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

//Servir archivos estáticos (imagen de logo)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/responsive-forms', responsiveFormsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/requisitions', requisitionsRoutes);
app.use('/api/clients', clientsRoutes);


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
    console.log(`Servidor SIAF ejecutándose en http://localhost:${PORT}`);
    console.log(` ${process.env.APP_NAME}`);
    console.log(` ${process.env.COMPANY_NAME}`);
    console.log(` ${process.env.COMPANY_ADDRESS}`);
    console.log(`${'='.repeat(60)}\n`);
});