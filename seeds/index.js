require('dotenv').config();
const mongoose = require('mongoose');
const seedCategories = require('./categories');
const seedClients = require('./clients');

const seedAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📊 Conectado a MongoDB\n');

        await seedCategories();
        await seedClients();

        console.log('\n✅ Todos los seeds ejecutados correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedAll();