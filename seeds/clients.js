// seeds/clients.js
const Client = require('../models/Client');

const clients = [
    { name: 'DAYJAF INTEGRALES' }
];

const seedClients = async () => {
    for (const client of clients) {
        const existing = await Client.findOne({ name: client.name });
        if (!existing) {
            await Client.create(client);
            console.log(`  ✅ Cliente creado: ${client.name}`);
        } else {
            console.log(`  ⚠️  Ya existe: ${client.name}`);
        }
    }
};

module.exports = seedClients;