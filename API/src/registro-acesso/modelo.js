// Acesso ao banco para o registro de acesso. Só consultas parametrizadas.
const banco = require('../config/conexaoBanco');

function gravar(r) {
  banco
    .prepare(
      `INSERT INTO acessos (id_requisicao, metodo, rota, status, duracao_ms, ip_hash, idioma, navegador)
       VALUES (@idRequisicao, @metodo, @rota, @status, @duracaoMs, @ipHash, @idioma, @navegador)`
    )
    .run(r);
}

function listar(limite = 50) {
  return banco
    .prepare(
      `SELECT id, criado_em, id_requisicao, metodo, rota, status, duracao_ms, ip_hash, idioma, navegador
         FROM acessos ORDER BY id DESC LIMIT ?`
    )
    .all(limite);
}

// Números para o painel: total, visitantes únicos (por hash), erros, tempo médio, rotas e idiomas mais usados, acessos por dia.
function resumo(dias = 7) {
  const desde = `-${Number(dias)} days`;
  const geral = banco
    .prepare(
      `SELECT COUNT(*) AS total,
              COUNT(DISTINCT ip_hash) AS visitantes_unicos,
              COALESCE(SUM(status >= 400), 0) AS erros,
              COALESCE(ROUND(AVG(duracao_ms), 1), 0) AS duracao_media_ms
         FROM acessos WHERE criado_em >= datetime('now', ?)`
    )
    .get(desde);
  const topRotas = banco
    .prepare(
      `SELECT metodo, rota, COUNT(*) AS total FROM acessos
        WHERE criado_em >= datetime('now', ?) GROUP BY metodo, rota ORDER BY total DESC LIMIT 10`
    )
    .all(desde);
  const idiomas = banco
    .prepare(
      `SELECT idioma, COUNT(*) AS total FROM acessos
        WHERE criado_em >= datetime('now', ?) GROUP BY idioma ORDER BY total DESC`
    )
    .all(desde);
  const porDia = banco
    .prepare(
      `SELECT date(criado_em) AS dia, COUNT(*) AS total FROM acessos
        WHERE criado_em >= datetime('now', ?) GROUP BY dia ORDER BY dia`
    )
    .all(desde);
  return { periodoDias: Number(dias), ...geral, topRotas, idiomas, porDia };
}

// Retenção: apaga o que passou do prazo (LGPD: não guardar dado além do necessário).
function limparAntigos(dias) {
  return banco.prepare(`DELETE FROM acessos WHERE criado_em < datetime('now', ?)`).run(`-${Number(dias)} days`).changes;
}

function todos() {
  return banco.prepare('SELECT * FROM acessos ORDER BY id').all();
}

module.exports = { gravar, listar, resumo, limparAntigos, todos };
