// Painel de acessos. O token fica só na aba (sessionStorage) e vai no cabeçalho Authorization.
import { API } from './utilitarios.js';

const CHAVE = 'agrotax-token-admin';
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem(CHAVE) || '';

// Constrói tabelas com textContent (nunca innerHTML): os dados vêm de visitantes e não são confiáveis.
function tabela(el, colunas, linhas) {
  el.replaceChildren();
  const cab = el.createTHead().insertRow();
  colunas.forEach((c) => { const th = document.createElement('th'); th.textContent = c.titulo; cab.appendChild(th); });
  const corpo = el.createTBody();
  linhas.forEach((l) => {
    const tr = corpo.insertRow();
    colunas.forEach((c) => { tr.insertCell().textContent = l[c.chave] ?? ''; });
  });
  if (!linhas.length) corpo.insertRow().insertCell().textContent = 'Sem registros no período.';
}

function cartoes(r) {
  const itens = [
    ['Acessos', r.total],
    ['Visitantes únicos', r.visitantes_unicos],
    ['Respostas com erro', r.erros],
    ['Tempo médio (ms)', r.duracao_media_ms],
  ];
  const caixa = $('cartoes');
  caixa.replaceChildren();
  itens.forEach(([rotulo, valor]) => {
    const art = document.createElement('article');
    art.className = 'cartao';
    const h = document.createElement('h3'); h.textContent = String(valor);
    const p = document.createElement('p'); p.textContent = rotulo;
    art.append(h, p);
    caixa.appendChild(art);
  });
}

async function chamar(caminho) {
  const resp = await fetch(API + caminho, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.status === 401) throw new Error('Token incorreto.');
  if (resp.status === 404) throw new Error('Área desativada: defina TOKEN_ADMIN no arquivo .env e reinicie o servidor.');
  if (!resp.ok) throw new Error('Não foi possível carregar os dados.');
  return resp;
}

async function carregar() {
  const dados = (await (await chamar(`/admin/acessos?dias=${$('periodo').value}`)).json()).dados;
  cartoes(dados.resumo);
  tabela($('tabela-rotas'), [{ titulo: 'Método', chave: 'metodo' }, { titulo: 'Rota', chave: 'rota' }, { titulo: 'Acessos', chave: 'total' }], dados.resumo.topRotas);
  tabela($('tabela-ultimos'), [
    { titulo: 'Data/hora (UTC)', chave: 'criado_em' }, { titulo: 'Método', chave: 'metodo' }, { titulo: 'Rota', chave: 'rota' },
    { titulo: 'Status', chave: 'status' }, { titulo: 'ms', chave: 'duracao_ms' }, { titulo: 'Idioma', chave: 'idioma' }, { titulo: 'Visitante (hash)', chave: 'ip_hash' },
  ], dados.ultimos);
  $('painel-admin').hidden = false;
}

async function baixar(tipo) {
  const blob = await (await chamar(`/admin/${tipo}.csv`)).blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function erro(e) { $('erro-admin').textContent = e.message; }

$('form-token').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  token = $('token').value.trim();
  $('erro-admin').textContent = '';
  try { await carregar(); sessionStorage.setItem(CHAVE, token); $('form-token').hidden = true; } catch (e) { erro(e); }
});
$('periodo').addEventListener('change', () => carregar().catch(erro));
document.addEventListener('click', (ev) => {
  const tipo = ev.target.closest('[data-csv]')?.dataset.csv;
  if (tipo) baixar(tipo).catch(erro);
});

if (token) carregar().then(() => { $('form-token').hidden = true; }).catch(() => sessionStorage.removeItem(CHAVE));
