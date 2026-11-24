-- AgroTax: estrutura do banco (SQLite). Pode rodar várias vezes sem apagar dados.

CREATE TABLE IF NOT EXISTS produtos (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nome   TEXT NOT NULL,
  ncm    TEXT NOT NULL UNIQUE,
  ativo  INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

-- Alíquotas versionadas por data. Se a lei mudar, INSIRA uma regra nova (não edite a antiga).
-- produto_id = 0  -> vale para qualquer produto.   regime/operacao = '*' -> vale para todos.
CREATE TABLE IF NOT EXISTS regras_tributarias (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tributo        TEXT NOT NULL CHECK (tributo IN ('ICMS','IPI','PIS','COFINS','FUNRURAL','SENAR')),
  produto_id     INTEGER NOT NULL DEFAULT 0,
  regime         TEXT NOT NULL DEFAULT '*',
  operacao       TEXT NOT NULL DEFAULT '*',
  aliquota       REAL NOT NULL CHECK (aliquota >= 0 AND aliquota <= 100),
  vigente_desde  TEXT NOT NULL,
  vigente_ate    TEXT,
  observacao     TEXT,
  UNIQUE (tributo, produto_id, regime, operacao, vigente_desde)
);

CREATE TABLE IF NOT EXISTS simulacoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id       INTEGER NOT NULL REFERENCES produtos(id),
  valor_centavos   INTEGER NOT NULL CHECK (valor_centavos > 0),
  regime           TEXT NOT NULL,
  operacao         TEXT NOT NULL,
  total_centavos   INTEGER NOT NULL,
  resultado_json   TEXT NOT NULL,
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_simulacoes_criado_em ON simulacoes (criado_em);

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL,
  mensagem   TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registro de acesso (1 linha por requisição ao site/API). Não guarda IP nem corpo da requisição:
-- só o hash do IP (para contar visitantes únicos sem identificar ninguém). Ver qualidade-e-saida-de-informacoes/04-registro-de-acesso.
CREATE TABLE IF NOT EXISTS acessos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  id_requisicao  TEXT NOT NULL,
  metodo         TEXT NOT NULL,
  rota           TEXT NOT NULL,
  status         INTEGER NOT NULL,
  duracao_ms     INTEGER NOT NULL,
  ip_hash        TEXT NOT NULL,
  idioma         TEXT NOT NULL DEFAULT 'pt',
  navegador      TEXT
);
CREATE INDEX IF NOT EXISTS idx_acessos_criado_em ON acessos (criado_em);
