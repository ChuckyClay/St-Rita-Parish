const fs = require('fs');
const path = require('path');

function getDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;

  if (configuredPath && configuredPath.trim()) {
    return path.resolve(configuredPath.trim());
  }

  return path.join(__dirname, 'parish.sqlite');
}

function ensureDatabaseDirectory(databasePath) {
  const directory = path.dirname(databasePath);
  fs.mkdirSync(directory, { recursive: true });
}

module.exports = {
  getDatabasePath,
  ensureDatabaseDirectory
};