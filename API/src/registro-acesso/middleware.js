// Registro de acesso: 1 linha no console (como antes) + 1 linha no banco por requisição.
// Privacidade (LGPD): não guarda IP (só hash com sal), nem corpo, nem query string, nem cabeçalho de autorização.
const crypto = require('crypto');
const { salRegistro } = require('../config/ambiente');
const modelo = require('./modelo');

const IGNORAR = ['/api/saude']; // verificações de saúde do Render/Docker não são visitas
const EXTENSOES_ESTATICAS = /\.(css|js|svg|png|jpg|jpeg|ico|woff2?|map)$/i;

const hashIp = (ip) => crypto.createHash('sha256').update(`${salRegistro}|${ip || ''}`).digest('hex').slice(0, 16);

// /api/simulacoes/12 -> /api/simulacoes/:id (evita milhares de rotas "diferentes" no painel)
const normalizarRota = (caminho) => caminho.replace(/\/\d+(?=\/|$)/g, '/:id').slice(0, 120);

function registroAcesso(req, res, next) {
  const id = crypto.randomBytes(4).toString('hex');
  const inicio = process.hrtime.bigint();
  res.set('X-Request-Id', id);

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const caminho = req.originalUrl.split('?')[0];
    console.log(`[${new Date().toISOString()}] ${id} ${req.method} ${caminho} ${res.statusCode} ${ms.toFixed(0)}ms`);

    if (IGNORAR.includes(caminho) || EXTENSOES_ESTATICAS.test(caminho)) return;
    try {
      modelo.gravar({
        idRequisicao: id,
        metodo: req.method,
        rota: normalizarRota(caminho),
        status: res.statusCode,
        duracaoMs: Math.round(ms),
        ipHash: hashIp(req.ip),
        idioma: (req.idioma || 'pt').slice(0, 5),
        navegador: (req.get('user-agent') || '').slice(0, 120),
      });
    } catch (e) {
      console.error('Falha ao gravar registro de acesso:', e.message); // o registro nunca derruba a requisição
    }
  });
  next();
}

module.exports = registroAcesso;
module.exports.hashIp = hashIp;
module.exports.normalizarRota = normalizarRota;
