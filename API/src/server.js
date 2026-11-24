const { porta, diasRetencaoRegistros } = require('./config/ambiente');
const { iniciarBanco } = require('../iniciarBanco');

iniciarBanco(); // garante tabelas e dados iniciais antes de aceitar requisições
const registros = require('./registro-acesso/modelo');
const apagados = registros.limparAntigos(diasRetencaoRegistros); // retenção (LGPD)
if (apagados) console.log(`Registros de acesso antigos apagados: ${apagados}`);
const app = require('./app');

app.listen(porta, () => console.log(`AgroTax rodando em http://localhost:${porta}`));
