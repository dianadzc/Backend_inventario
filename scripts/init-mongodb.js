// scripts/init-mongodb.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AssetCategory = require('../models/AssetCategory');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/siaf_hotel');
        console.log(' Conectado a MongoDB');
    } catch (error) {
        console.error(' Error al conectar:', error);
        process.exit(1);
    }
};

const initDatabase = async () => {
    try {
        console.log('\n Iniciando base de datos MongoDB...\n');

        // Limpiar datos existentes (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            await User.deleteMany({});
            await AssetCategory.deleteMany({});
            console.log(' Base de datos limpiada');
        }

        // Crear usuario administrador
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            username: 'admin',
            email: 'admin@beachscape.com',
            password: adminPassword,
            full_name: 'Administrador del Sistema',
            role: 'admin',
            department: 'Sistemas'
        });
        await admin.save();
        console.log(' Usuario admin creado');

        // Crear categorías de activos
        const categories = [
            { name: 'Computadoras', description: 'Equipos de cómputo y laptops' },
            { name: 'Impresoras', description: 'Impresoras y equipos de impresión' },
            { name: 'Cámaras de Seguridad', description: 'Sistemas de vigilancia' },
            { name: 'Equipos de Red', description: 'Routers, switches, access points' },
            { name: 'Software', description: 'Licencias de software' },
            { name: 'Mobiliario de Oficina', description: 'Escritorios, sillas, archiveros' },
            { name: 'Equipos de Audio/Video', description: 'Proyectores, pantallas, bocinas' },
            { name: 'Otros', description: 'Otros activos' }
        ];

        for (const cat of categories) {
            const category = new AssetCategory(cat);
            await category.save();
        }
        console.log('Categorías creadas');

        console.log('\n' + '='.repeat(60));
        console.log('Base de datos MongoDB inicializada correctamente');
        console.log('='.repeat(60));
        console.log('\n Credenciales por defecto:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
        console.log('\n Servidor: http://localhost:5001');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error(' Error al inicializar base de datos:', error);
    } finally {
        await mongoose.connection.close();
        console.log(' Conexión cerrada\n');
        process.exit(0);
    }
};

// Ejecutar
connectDB().then(initDatabase);