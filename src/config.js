const path = require('path');
const { version } = require('../package.json');

module.exports = {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    DB_FILE: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'database.sqlite'),
    VERSION: version,
    GIT_SHA: process.env.GIT_SHA || 'local',

    MESSAGE: 'Hola desde el pipeline CI/CD Version prueba',
};
