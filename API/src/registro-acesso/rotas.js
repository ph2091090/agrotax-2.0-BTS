const router = require('express').Router();
const ctrl = require('./controlador');
const autenticacaoAdmin = require('../middlewares/autenticacaoAdmin');

// Tudo aqui exige "Authorization: Bearer <TOKEN_ADMIN>". Sem TOKEN_ADMIN no .env, as rotas ficam desativadas (404).
router.use('/admin', autenticacaoAdmin);
router.get('/admin/acessos', ctrl.painel); // ?dias=7
router.get('/admin/acessos.csv', ctrl.exportarAcessos);
router.get('/admin/simulacoes.csv', ctrl.exportarSimulacoes);
router.get('/admin/leads.csv', ctrl.exportarLeads);

module.exports = router;
