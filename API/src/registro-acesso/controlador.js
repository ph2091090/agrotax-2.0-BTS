// Área administrativa (protegida por TOKEN_ADMIN): painel de acessos e exportação dos dados em CSV.
const modelo = require('./modelo');
const banco = require('../config/conexaoBanco');
const { gerarCsv } = require('../utilitarios/csv');

const dias = (req) => Math.min(Math.max(parseInt(req.query?.dias, 10) || 7, 1), 365);

function painel(req, res) {
  res.json({ sucesso: true, dados: { resumo: modelo.resumo(dias(req)), ultimos: modelo.listar(50) } });
}

function enviarCsv(res, nome, colunas, linhas) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nome}-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  res.send(gerarCsv(colunas, linhas));
}

function exportarAcessos(req, res) {
  enviarCsv(
    res,
    'acessos',
    [
      { titulo: 'id', chave: 'id' },
      { titulo: 'data_hora_utc', chave: 'criado_em' },
      { titulo: 'id_requisicao', chave: 'id_requisicao' },
      { titulo: 'metodo', chave: 'metodo' },
      { titulo: 'rota', chave: 'rota' },
      { titulo: 'status', chave: 'status' },
      { titulo: 'duracao_ms', chave: 'duracao_ms' },
      { titulo: 'visitante_hash', chave: 'ip_hash' },
      { titulo: 'idioma', chave: 'idioma' },
      { titulo: 'navegador', chave: 'navegador' },
    ],
    modelo.todos()
  );
}

function exportarSimulacoes(req, res) {
  const linhas = banco
    .prepare(
      `SELECT s.id, s.criado_em, p.nome AS produto, s.regime, s.operacao,
              printf('%.2f', s.valor_centavos / 100.0) AS valor_reais,
              printf('%.2f', s.total_centavos / 100.0) AS total_tributos_reais
         FROM simulacoes s JOIN produtos p ON p.id = s.produto_id ORDER BY s.id`
    )
    .all();
  enviarCsv(
    res,
    'simulacoes',
    ['id', 'criado_em', 'produto', 'regime', 'operacao', 'valor_reais', 'total_tributos_reais'].map((c) => ({ titulo: c, chave: c })),
    linhas
  );
}

function exportarLeads(req, res) {
  const linhas = banco.prepare('SELECT id, criado_em, nome, email, mensagem FROM leads ORDER BY id').all();
  enviarCsv(res, 'leads', ['id', 'criado_em', 'nome', 'email', 'mensagem'].map((c) => ({ titulo: c, chave: c })), linhas);
}

module.exports = { painel, exportarAcessos, exportarSimulacoes, exportarLeads };
