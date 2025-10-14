// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📊 Conectado a MongoDB');

        // Verificar si ya existe
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('⚠️  Usuario admin ya existe');
            process.exit(0);
        }

        // Crear admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await User.create({
            username: 'admin',
            email: 'admin@hotelkinha.com',
            password: hashedPassword,
            full_name: 'Administrador del Sistema',
            role: 'admin',
            department: 'Sistemas'
        });
        
        console.log('✅ Usuario admin creado exitosamente');
        console.log('📧 Username: admin');
        console.log('🔑 Password: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAdmin();