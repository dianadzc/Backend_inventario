const AssetCategory = require('../models/AssetCategory');

const categories = [
    { name: 'Computadora', description: 'Equipos de cómputo y laptops' },
    { name: 'Impresora', description: 'Impresoras y escáneres' },
    { name: 'Cámara', description: 'Cámaras de seguridad' },
    { name: 'Red', description: 'Equipos de red' },
    { name: 'Software', description: 'Licencias de software' },
    { name: 'Otro', description: 'Otros activos' }
];

module.exports = async () => {
    console.log('🏷️  Creando categorías...');
    for (const cat of categories) {
        const existing = await AssetCategory.findOne({ name: cat.name });
        if (!existing) {
            await AssetCategory.create(cat);
            console.log(`  ✅ ${cat.name}`);
        } else {
            console.log(`  ⚠️  Ya existe: ${cat.name}`);
        }
    }
};