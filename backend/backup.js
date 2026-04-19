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
  ensureBackupDir();

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sqlite'))
    .map(file => {
      const fullPath = path.join(backupDir, file);
      const stats = fs.statSync(fullPath);
      return {
        file,
        fullPath,
        size: stats.size,
        createdAt: stats.mtimeMs
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

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

function listBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sqlite'))
    .map(file => {
      const fullPath = path.join(backupDir, file);
      const stats = fs.statSync(fullPath);
      return {
        file,
        size: stats.size,
        createdAt: stats.mtime
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return files;
}

function getBackupPath(fileName) {
  ensureBackupDir();

  if (
    !fileName ||
    typeof fileName !== 'string' ||
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    !fileName.endsWith('.sqlite')
  ) {
    return null;
  }

  const fullPath = path.join(backupDir, fileName);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

function deleteBackup(fileName) {
  const fullPath = getBackupPath(fileName);

  if (!fullPath) {
    throw new Error('Backup file not found.');
  }

  fs.unlinkSync(fullPath);

  return { success: true, fileName };
}

module.exports = {
  backupDatabase,
  listBackups,
  getBackupPath,
  deleteBackup
};