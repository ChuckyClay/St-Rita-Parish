const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'parish.sqlite');
const backupDir = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function cleanupOldBackups() {
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sqlite'))
    .map(file => ({
      file,
      fullPath: path.join(backupDir, file),
      mtime: fs.statSync(path.join(backupDir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const oldFiles = files.slice(MAX_BACKUPS);

  for (const file of oldFiles) {
    fs.unlinkSync(file.fullPath);
  }
}

function backupDatabase() {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    if (!fs.existsSync(dbPath)) {
      return reject(new Error('Database file not found.'));
    }

    const backupFileName = `parish-${makeTimestamp()}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) return reject(err);

      try {
        cleanupOldBackups();
      } catch (cleanupErr) {
        console.warn('Backup cleanup warning:', cleanupErr.message);
      }

      resolve({
        success: true,
        fileName: backupFileName,
        backupPath
      });
    });
  });
}

module.exports = { backupDatabase };