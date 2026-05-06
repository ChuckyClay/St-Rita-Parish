const fs = require('fs');
const path = require('path');

function isWritableDirectory(directoryPath) {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.accessSync(directoryPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveDatabasePath() {
  const candidates = [];

  const configuredPath = process.env.DATABASE_PATH;
  if (configuredPath && configuredPath.trim()) {
    candidates.push(path.resolve(configuredPath.trim()));
  }

  const renderDiskMount = process.env.RENDER_DISK_MOUNT_PATH;
  if (renderDiskMount && renderDiskMount.trim()) {
    candidates.push(path.join(path.resolve(renderDiskMount.trim()), 'parish.sqlite'));
  }

  candidates.push(path.join(__dirname, 'parish.sqlite'));

  for (const candidate of candidates) {
    const directory = path.dirname(candidate);
    if (isWritableDirectory(directory)) {
      return candidate;
    }
  }

  return path.join(__dirname, 'parish.sqlite');
}

function getDatabasePath() {
  return resolveDatabasePath();
}

function ensureDatabaseDirectory(databasePath) {
  const directory = path.dirname(databasePath);
  if (!isWritableDirectory(directory)) {
    throw new Error(`Database directory is not writable: ${directory}`);
  }
}

module.exports = {
  getDatabasePath,
  ensureDatabaseDirectory
};