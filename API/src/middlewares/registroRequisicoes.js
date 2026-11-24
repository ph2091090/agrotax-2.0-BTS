// O registro de requisições agora vive em src/registro-acesso/ (console + banco). Este arquivo só reexporta.
module.exports = require('../registro-acesso/middleware');
