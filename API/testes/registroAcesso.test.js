// Testes do registro de acesso e da exportação CSV (banco SQLite em memória, sem subir servidor).
process.env.ARQUIVO_BANCO = ':memory:';
process.env.TOKEN_ADMIN = 'segredo-de-teste';
process.env.SAL_REGISTRO = 'sal-de-teste';

const test = require('node:test');
const assert = require('node:assert');
const { iniciarBanco } = require('../iniciarBanco');
iniciarBanco();

const banco = require('../src/config/conexaoBanco');
const modelo = require('../src/registro-acesso/modelo');
const registroAcesso = require('../src/registro-acesso/middleware');
const ctrl = require('../src/registro-acesso/controlador');
const { gerarCsv, celula } = require('../src/utilitarios/csv');

function requisicao(extra = {}) {
  return { method: 'GET', originalUrl: '/api/produtos?x=1', ip: '203.0.113.9', idioma: 'es', query: {}, get: () => 'Teste/1.0', ...extra };
}
function resposta(status = 200) {
  const ouvintes = {};
  return {
    statusCode: status, cabecalhos: {}, corpo: null,
    set(c, v) { if (typeof c === 'object') Object.assign(this.cabecalhos, c); else this.cabecalhos[c] = v; return this; },
    on(ev, fn) { ouvintes[ev] = fn; return this; },
    terminar() { ouvintes.finish(); },
    json(c) { this.corpo = c; return this; },
    send(c) { this.corpo = c; return this; },
  };
}
const silenciar = (fn) => { const orig = console.log; console.log = () => {}; try { return fn(); } finally { console.log = orig; } };

test('middleware grava o acesso, sem IP e sem query string, com idioma e rota normalizada', () => {
  banco.exec('DELETE FROM acessos');
  const res = resposta(200);
  silenciar(() => { registroAcesso(requisicao({ originalUrl: '/api/simulacoes/42?senha=1' }), res, () => {}); res.terminar(); });

  const [linha] = modelo.listar(1);
  assert.strictEqual(linha.rota, '/api/simulacoes/:id');
  assert.strictEqual(linha.idioma, 'es');
  assert.strictEqual(linha.status, 200);
  assert.strictEqual(linha.ip_hash.length, 16);
  assert.ok(!JSON.stringify(linha).includes('203.0.113.9'), 'o IP puro não pode aparecer');
  assert.ok(!JSON.stringify(linha).includes('senha'), 'a query string não pode ser gravada');
  assert.ok(res.cabecalhos['X-Request-Id']);
});

test('ignora /api/saude e arquivos estáticos', () => {
  banco.exec('DELETE FROM acessos');
  for (const url of ['/api/saude', '/css/estilo.css', '/js/app.js']) {
    const res = resposta(200);
    silenciar(() => { registroAcesso(requisicao({ originalUrl: url }), res, () => {}); res.terminar(); });
  }
  assert.strictEqual(modelo.listar().length, 0);
});

test('mesmo IP gera o mesmo hash e IPs diferentes geram hashes diferentes', () => {
  assert.strictEqual(registroAcesso.hashIp('1.1.1.1'), registroAcesso.hashIp('1.1.1.1'));
  assert.notStrictEqual(registroAcesso.hashIp('1.1.1.1'), registroAcesso.hashIp('2.2.2.2'));
});

test('resumo conta total, visitantes únicos, erros e idiomas', () => {
  banco.exec('DELETE FROM acessos');
  const casos = [['1.1.1.1', 200, 'pt'], ['1.1.1.1', 200, 'pt'], ['2.2.2.2', 404, 'es']];
  for (const [ip, status, idioma] of casos) {
    const res = resposta(status);
    silenciar(() => { registroAcesso(requisicao({ ip, idioma }), res, () => {}); res.terminar(); });
  }
  const r = modelo.resumo(7);
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.visitantes_unicos, 2);
  assert.strictEqual(r.erros, 1);
  assert.deepStrictEqual(r.idiomas.map((i) => [i.idioma, i.total]), [['pt', 2], ['es', 1]]);
});

test('retenção apaga só o que passou do prazo', () => {
  banco.exec('DELETE FROM acessos');
  const ins = banco.prepare(`INSERT INTO acessos (criado_em, id_requisicao, metodo, rota, status, duracao_ms, ip_hash) VALUES (?, 'x', 'GET', '/', 200, 1, 'h')`);
  ins.run("2000-01-01 00:00:00");
  ins.run(new Date().toISOString().slice(0, 19).replace('T', ' '));
  assert.strictEqual(modelo.limparAntigos(90), 1);
  assert.strictEqual(modelo.listar().length, 1);
});

test('painel e CSV de acessos respondem com os dados', () => {
  const p = resposta();
  ctrl.painel(requisicao({ query: { dias: '7' } }), p);
  assert.strictEqual(p.corpo.sucesso, true);
  assert.ok('resumo' in p.corpo.dados && Array.isArray(p.corpo.dados.ultimos));

  const c = resposta();
  ctrl.exportarAcessos(requisicao(), c);
  assert.match(c.cabecalhos['Content-Type'], /text\/csv/);
  assert.match(c.cabecalhos['Content-Disposition'], /acessos-\d{4}-\d{2}-\d{2}\.csv/);
  assert.ok(c.corpo.startsWith('\uFEFFid;data_hora_utc;'));
});

test('CSV de leads neutraliza fórmulas e escapa aspas/ponto e vírgula', () => {
  banco.prepare('INSERT INTO leads (nome, email, mensagem) VALUES (?, ?, ?)').run('=HYPERLINK("http://mal")', 'a@b.com', 'oi; "tchau"');
  const r = resposta();
  ctrl.exportarLeads(requisicao(), r);
  assert.ok(r.corpo.includes(`'=HYPERLINK`), 'fórmula precisa ganhar apóstrofo');
  assert.ok(r.corpo.includes('"oi; ""tchau"""'));
});

test('gerarCsv: BOM, separador ; e quebra de linha CRLF', () => {
  const csv = gerarCsv([{ titulo: 'a', chave: 'a' }, { titulo: 'b', chave: 'b' }], [{ a: 1, b: 'x' }]);
  assert.strictEqual(csv, '\uFEFFa;b\r\n1;x\r\n');
  assert.strictEqual(celula('+55 62'), "'+55 62");
  assert.strictEqual(celula(null), '');
});

test('CSV de simulações lista a simulação com o nome do produto', () => {
  const calc = require('../src/controladores/calculadoraControlador');
  calc.calcular({ body: { produtoId: 1, valor: 100000, regime: 'Produtor Rural PF', operacao: 'Venda' } }, { status() { return this; }, json() {} });
  const r = resposta();
  ctrl.exportarSimulacoes(requisicao(), r);
  assert.ok(r.corpo.includes('100000.00;13500.00'));
});
