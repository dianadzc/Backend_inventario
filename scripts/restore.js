// Backend/scripts/restore.js
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const restore = (backupFileName) => {
  if (!backupFileName) {
    console.log(' Debes especificar el archivo de backup');
    console.log('Uso: node scripts/restore.js backup_2025-01-04.gz');
    process.exit(1);
  }

  const backupFile = path.join(__dirname, '../backups', backupFileName);
  
  console.log(` Restaurando desde: ${backupFile}...`);
  console.log('  ADVERTENCIA: Esto sobrescribirá la base de datos actual');

  const command = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${backupFile}" --gzip --drop`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(' Error al restaurar:', error);
      return;
    }
    console.log('Base de datos restaurada exitosamente');
  });
};

const backupFile = process.argv[2];
restore(backupFile);