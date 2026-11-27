const { contextBridge, ipcRenderer } = require('electron');

const CHAVE_TOKEN = 'agrotax-token-admin';
const plataforma = typeof process !== 'undefined' && process.platform
  ? process.platform
  : (/Linux/i.test(navigator.userAgent) ? 'linux' : 'windows');
let tokenCache = '';

try {
  tokenCache = ipcRenderer.sendSync('agrotax:session:getSync', CHAVE_TOKEN) || '';
} catch (e) {
  tokenCache = '';
}

function toast(mensagem) {
  const el = document.getElementById('aviso-toast');
  if (!el) { console.info('[AgroTax]', mensagem); return; }
  el.textContent = mensagem;
  el.classList.add('mostrar');
  clearTimeout(el.__agrotaxTimer);
  el.__agrotaxTimer = setTimeout(() => el.classList.remove('mostrar'), 4000);
}

function instalarcacheSessao() {
  const nativo = window.sessionStorage;
  const shim = {
    getItem(chave) {
      return chave === CHAVE_TOKEN ? (tokenCache || null) : nativo.getItem(chave);
    },
    setItem(chave, valor) {
      if (chave === CHAVE_TOKEN) {
        tokenCache = String(valor);
        ipcRenderer.invoke('agrotax:session:set', chave, tokenCache).catch(() => {});
      } else nativo.setItem(chave, valor);
    },
    removeItem(chave) {
      if (chave === CHAVE_TOKEN) {
        tokenCache = '';
        ipcRenderer.invoke('agrotax:session:remove', chave).catch(() => {});
      } else nativo.removeItem(chave);
    },
    clear() {
      tokenCache = '';
      ipcRenderer.invoke('agrotax:session:remove', CHAVE_TOKEN).catch(() => {});
      nativo.clear();
    },
    key(indice) {
      return indice === 0 && tokenCache ? CHAVE_TOKEN : nativo.key(tokenCache ? indice - 1 : indice);
    },
    get length() { return nativo.length + (tokenCache ? 1 : 0); },
  };
  try {
    Object.defineProperty(window, 'sessionStorage', { value: shim, configurable: false });
  } catch (e) {
    console.warn('[AgroTax] Não foi possível estender sessionStorage; usando comportamento padrão.');
  }
}

function instalarEstilo() {
  try {
    const css = ipcRenderer.sendSync('agrotax:cssSync');
    const folha = new CSSStyleSheet();
    folha.replaceSync(css);
    document.adoptedStyleSheets = Array.from(document.adoptedStyleSheets || []).concat([folha]);
  } catch (e) {
    console.warn('[AgroTax] Falha ao aplicar o estilo do aplicativo.', e);
  }
}

function instalarNavegacao() {
  document.body.classList.add('agrotax-app', 'agrotax-desktop');

  const cabecalho = document.querySelector('.topo');
  if (cabecalho && !document.querySelector('.agrotax-acoes-app')) {
    const acoes = document.createElement('div');
    acoes.className = 'agrotax-acoes-app';
    const admin = document.createElement('button');
    admin.type = 'button';
    admin.textContent = 'Painel';
    admin.addEventListener('click', () => ipcRenderer.invoke('agrotax:navegarAdmin'));
    acoes.appendChild(admin);

    if (location.pathname.indexOf('admin') >= 0 && tokenCache) {
      const sair = document.createElement('button');
      sair.type = 'button';
      sair.textContent = 'Sair';
      sair.addEventListener('click', () => {
        tokenCache = '';
        ipcRenderer.invoke('agrotax:session:remove', CHAVE_TOKEN).catch(() => {});
        ipcRenderer.invoke('agrotax:navegarHome');
      });
      acoes.appendChild(sair);
    }
    cabecalho.appendChild(acoes);
  }

  ipcRenderer.on('agrotax:navegar', (evento, hash) => {
    const alvo = document.querySelector(String(hash));
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (location.pathname.indexOf('admin') < 0) ipcRenderer.invoke('agrotax:navegarHome');
  });
}

function instalarLinks() {
  document.addEventListener('click', (evento) => {
    const a = evento.target && evento.target.closest && evento.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;
    const u = new URL(href, location.href);
    if (u.origin === location.origin) return;
    evento.preventDefault();
    ipcRenderer.invoke('agrotax:abrirExterno', u.href).then((permitido) => {
      if (!permitido) toast('Link externo bloqueado por segurança.');
    });
  }, true);
}

function instalarDownload() {
  document.addEventListener('click', (evento) => {
    const a = evento.target && evento.target.closest && evento.target.closest('a[download]');
    if (!a || !/^blob:/i.test(a.href)) return;
    evento.preventDefault();
    evento.stopPropagation();
    const nome = (a.getAttribute('download') || 'agrotax-exportacao.csv').replace(/[^\w.-]/g, '_');
    fetch(a.href)
      .then((r) => r.text())
      .then((texto) => ipcRenderer.invoke('agrotax:salvarTexto', { filename: nome, text: texto }))
      .then((caminho) => toast(caminho ? 'Arquivo salvo em ' + caminho : 'Download cancelado.'))
      .catch(() => toast('Não foi possível salvar o arquivo.'));
  }, true);
}

function instalarFetch() {
  const original = window.fetch.bind(window);
  window.fetch = function (recurso, opcoes) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), 20000);
    const init = Object.assign({}, opcoes || {});
    const sinais = [controle.signal];
    if (init.signal) sinais.push(init.signal);
    init.signal = AbortSignal.any ? AbortSignal.any(sinais) : controle.signal;
    return original(recurso, init)
      .then((resposta) => { clearTimeout(timer); if (!resposta.ok) toast('O servidor do AgroTax respondeu com erro ' + resposta.status + '.'); return resposta; })
      .catch((erro) => {
        clearTimeout(timer);
        toast(erro && erro.name === 'AbortError' ? 'A conexão está lenta. Tente novamente.' : 'Sem conexão com o AgroTax. Verifique sua internet.');
        throw erro;
      });
  };
}

function iniciar() {
  instalarcacheSessao();
  instalarEstilo();
  instalarNavegacao();
  instalarLinks();
  instalarDownload();
  instalarFetch();
  document.dispatchEvent(new CustomEvent('agrotax:ready', { detail: { plataforma } }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();

contextBridge.exposeInMainWorld('agrotaxDesktop', Object.freeze({
  isNative: true,
  plataforma,
  notificar: (opcoes) => ipcRenderer.invoke('agrotax:notificar', opcoes),
  salvarTexto: (opcoes) => ipcRenderer.invoke('agrotax:salvarTexto', opcoes),
  abrirArquivo: (arquivo) => ipcRenderer.invoke('agrotax:abrirArquivo', arquivo),
  abrirExterno: (url) => ipcRenderer.invoke('agrotax:abrirExterno', url),
  imprimir: () => ipcRenderer.invoke('agrotax:imprimir'),
  info: () => ipcRenderer.invoke('agrotax:info'),
  versao: () => ipcRenderer.invoke('agrotax:info').then((i) => i.versao),
  getPreference: (chave) => Promise.resolve(window.localStorage.getItem('agrotax-pref-' + chave)),
  setPreference: (chave, valor) => { window.localStorage.setItem('agrotax-pref-' + chave, String(valor)); return Promise.resolve(true); },
  logout: () => {
    tokenCache = '';
    ipcRenderer.invoke('agrotax:session:remove', CHAVE_TOKEN).catch(() => {});
    ipcRenderer.invoke('agrotax:navegarHome');
  },
  toast,
}));
