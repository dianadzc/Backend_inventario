// server.js - VERSIÓN MONGODB ACTUALIZADA
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
const PORT = process.env.PORT || 5002;

// Conectar a MongoDB
connectDB();

// ⭐ CONFIGURACIÓN CORS COMPLETA PARA RED
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174', 
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://192.168.0.49:5173',
            'http://192.168.0.49:3000'
        ];
        
        // Permitir requests sin origin (como Postman o mismo servidor)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS bloqueado para origen:', origin);
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
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Servir archivos estáticos (imagen de logo)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==================== RUTAS DE LA APLICACIÓN ====================
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/responsive-forms', responsiveFormsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/requisitions', requisitionsRoutes);
app.use('/api/clients', clientsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend funcionando con MongoDB',
        timestamp: new Date().toISOString(),
        database: 'MongoDB'
    });
});

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
    
    if (err.message === 'No permitido por CORS') {
        return res.status(403).json({ message: 'Origen no permitido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Iniciar servidor en todas las interfaces de red
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Backend corriendo en http://0.0.0.0:${PORT}`);
    console.log(`📍 Accesible desde: http://192.168.0.49:${PORT}`);
    console.log(`🗄️  Base de datos: MongoDB`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`${'='.repeat(60)}\n`);
});
