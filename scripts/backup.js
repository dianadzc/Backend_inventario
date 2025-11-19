// Backend/scripts/backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const backup = () => {
  const date = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '../backups');
  const backupFile = path.join(backupDir, `backup_${date}.gz`);

  // Crear directorio si no existe
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Extraer nombre de la BD de la URI
  const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];

  console.log(` Creando backup de ${dbName}...`);

  const command = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${backupFile}" --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(' Error al crear backup:', error);
      return;
    }
    console.log(`Backup creado: ${backupFile}`);
    console.log(`Tamaño: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
  });
};

backup();