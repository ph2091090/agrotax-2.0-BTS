(function () {
  'use strict';
  if (window.__agrotaxMobileAdapter) return;
  window.__agrotaxMobileAdapter = true;

  var PT = { inicio: 'Início', calcular: 'Calcular', guia: 'Guia', painel: 'Painel', sair: 'Sair', anexar: 'Anexar imagem' };
  var ES = { inicio: 'Inicio', calcular: 'Calcular', guia: 'Guía', painel: 'Panel', sair: 'Salir', anexar: 'Adjuntar imagen' };

  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  }

  function plugin(nome) {
    var p = plugins()[nome];
    if (!p) throw new Error('Recurso nativo indisponível: ' + nome);
    return p;
  }

  function idioma() {
    try { return localStorage.getItem('agrotax-idioma') === 'es' ? ES : PT; } catch (e) { return PT; }
  }

  function toast(mensagem) {
    var el = document.getElementById('aviso-toast');
    if (!el) { console.info('[AgroTax]', mensagem); return; }
    el.textContent = mensagem;
    el.classList.add('mostrar');
    clearTimeout(el.__agrotaxTimer);
    el.__agrotaxTimer = setTimeout(function () { el.classList.remove('mostrar'); }, 4000);
  }

  function criarElemento(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }

  function instalarConexao() {
    var aviso = criarElemento('div');
    aviso.id = 'agrotax-conexao';
    aviso.hidden = true;
    document.body.appendChild(aviso);

    function mostrar(online) {
      aviso.textContent = online ? '' : 'Sem conexão. As consultas voltarão automaticamente quando a internet retornar.';
      aviso.hidden = online;
    }

    mostrar(navigator.onLine !== false);
    window.addEventListener('offline', function () { mostrar(false); });
    window.addEventListener('online', function () { mostrar(true); });

    var rede = plugins().Network;
    if (rede && rede.addListener) {
      rede.addListener('networkStatusChange', function (estado) { mostrar(estado.connected); }).catch(function () {});
    }
  }

  function instalarFetch() {
    var fetchOriginal = window.fetch.bind(window);
    var timeout = 20000;
    window.fetch = function (recurso, opcoes) {
      var ctrl = new AbortController();
      var alvo = typeof recurso === 'string' ? recurso : (recurso && recurso.url) || '';
      var timer = setTimeout(function () { ctrl.abort(); }, timeout);
      var init = Object.assign({}, opcoes || {});
      var sinais = [];
      if (init.signal) sinais.push(init.signal);
      sinais.push(ctrl.signal);
      init.signal = sinais.length === 1 ? sinais[0] : (AbortSignal.any ? AbortSignal.any(sinais) : ctrl.signal);

      return fetchOriginal(recurso, init).then(function (resposta) {
        clearTimeout(timer);
        if (!resposta.ok && /\/api\//.test(alvo)) {
          toast('O servidor do AgroTax respondeu com erro ' + resposta.status + '.');
        }
        return resposta;
      }).catch(function (erro) {
        clearTimeout(timer);
        var nome = erro && erro.name;
        if (nome === 'AbortError') {
          toast('A conexão está lenta. Tente novamente em instantes.');
          throw new Error('Tempo limite ao consultar o AgroTax.');
        }
        toast('Sem conexão com o AgroTax. Verifique sua internet.');
        throw erro;
      });
    };
  }

  function destinoSeguro(url) {
    try {
      var u = new URL(url, location.href);
      return /^https?:$/.test(u.protocol);
    } catch (e) { return false; }
  }

  function abrirExterno(url) {
    if (!destinoSeguro(url)) { toast('Link externo bloqueado por segurança.'); return Promise.reject(new Error('URL inválida')); }
    var browser = plugins().Browser;
    if (browser && browser.open) return browser.open({ url: url, toolbarColor: '#2f8f5b' });
    return Promise.resolve(window.open(url, '_system', 'noopener'));
  }

  function instalarLinks() {
    document.addEventListener('click', function (evento) {
      var a = evento.target && evento.target.closest && evento.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.hasAttribute('download')) return;
      if (!/^https?:/i.test(href)) return;
      var u = new URL(href, location.href);
      if (u.origin === location.origin) return;
      evento.preventDefault();
      abrirExterno(u.href).catch(function () {});
    }, true);
  }

  function instalarDownload() {
    document.addEventListener('click', function (evento) {
      var a = evento.target && evento.target.closest && evento.target.closest('a[download]');
      if (!a || !/^blob:/i.test(a.href)) return;
      evento.preventDefault();
      evento.stopPropagation();
      var nome = (a.getAttribute('download') || 'agrotax-exportacao.csv').replace(/[^\w.-]/g, '_');
      fetch(a.href).then(function (r) { return r.blob(); }).then(function (blob) {
        return new Promise(function (resolve, reject) {
          var leitor = new FileReader();
          leitor.onload = function () { resolve(String(leitor.result).split(',')[1] || ''); };
          leitor.onerror = reject;
          leitor.readAsDataURL(blob);
        });
      }).then(function (base64) {
        return plugin('Filesystem').writeFile({ path: nome, data: base64, directory: 'DOCUMENTS', recursive: true });
      }).then(function (gravado) {
        return plugin('Share').share({ title: 'AGROTAX', text: 'Exportação AgroTax', files: [gravado.uri] });
      }).then(function () {
        toast('Arquivo salvo e pronto para compartilhar.');
      }).catch(function () {
        toast('Não foi possível salvar o arquivo neste dispositivo.');
      });
    }, true);
  }

  function instalarNavegacao() {
    document.body.classList.add('agrotax-app', 'agrotax-mobile');

    var abas = [
      { id: 'inicio', chave: 'inicio', icone: '🏠', alvo: '#inicio' },
      { id: 'calculadora', chave: 'calcular', icone: '🧮', alvo: '#calculadora' },
      { id: 'guia', chave: 'guia', icone: '📊', alvo: '#guia' },
      { id: 'painel', chave: 'painel', icone: '🔒', alvo: '/admin.html' }
    ];
    if (location.pathname.indexOf('admin') >= 0) abas[3].alvo = './';

    var barra = criarElemento('nav', 'agrotax-tabbar');
    barra.setAttribute('aria-label', 'Navegação do aplicativo AGROTAX');
    abas.forEach(function (aba) {
      var botao = criarElemento('button', null, '<span class="agrotax-tab-icone" aria-hidden="true">' + aba.icone + '</span><span class="agrotax-tab-rotulo">' + idioma()[aba.chave] + '</span>');
      botao.type = 'button';
      botao.dataset.agrotaxAba = aba.id;
      botao.addEventListener('click', function () {
        if (/^#/.test(aba.alvo)) {
          var secao = document.querySelector(aba.alvo);
          if (secao) {
            secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', aba.alvo);
          }
        } else {
          location.href = aba.alvo;
        }
      });
      barra.appendChild(botao);
    });
    document.body.appendChild(barra);

    function atualizarRotulos() {
      var rotulos = document.querySelectorAll('.agrotax-tab-rotulo');
      var texto = idioma();
      Array.prototype.forEach.call(rotulos, function (el, indice) {
        el.textContent = texto[abas[indice].chave];
      });
    }
    setInterval(atualizarRotulos, 1500);

    function atualizarAtiva() {
      var ativa = 'inicio';
      ['inicio', 'calculadora', 'guia', 'sobre'].forEach(function (id) {
        var secao = document.getElementById(id);
        if (secao && secao.getBoundingClientRect().top < window.innerHeight * 0.4) ativa = id === 'sobre' ? 'painel' : id;
      });
      if (location.pathname.indexOf('admin') >= 0) ativa = 'painel';
      Array.prototype.forEach.call(barra.children, function (botao) {
        botao.setAttribute('aria-current', botao.dataset.agrotaxAba === ativa ? 'true' : 'false');
      });
    }
    window.addEventListener('scroll', atualizarAtiva, { passive: true });
    atualizarAtiva();

    if (location.pathname.indexOf('admin') >= 0) {
      try {
        if (sessionStorage.getItem('agrotax-token-admin')) {
          var acoes = criarElemento('div', 'agrotax-acoes-app');
          var sair = criarElemento('button', null, idioma().sair);
          sair.type = 'button';
          sair.addEventListener('click', function () {
            sessionStorage.removeItem('agrotax-token-admin');
            location.href = './';
          });
          acoes.appendChild(sair);
          document.querySelector('.topo') && document.querySelector('.topo').appendChild(acoes);
        }
      } catch (e) { /* sessão indisponível: mantém comportamento original */ }
    }
  }

  function instalarBridge() {
    var CameraSource = { Camera: 1, Photos: 2, Prompt: 0 };

    window.AgrotaxNative = {
      plataforma: 'android',
      isNative: true,
      pickImage: function (opcoes) {
        opcoes = opcoes || {};
        var origem = opcoes.source === 'camera' ? CameraSource.Camera : opcoes.source === 'gallery' ? CameraSource.Photos : CameraSource.Prompt;
        return plugin('Camera').getPhoto({ quality: 80, allowEditing: false, resultType: 'Uri', source: origem });
      },
      shareFile: function (opcoes) {
        return plugin('Share').share({ title: 'AGROTAX', text: (opcoes && opcoes.text) || 'Arquivo do AgroTax', files: (opcoes && opcoes.files) || [] });
      },
      downloadText: function (opcoes) {
        var nome = String((opcoes && opcoes.filename) || 'agrotax.txt').replace(/[^\w.-]/g, '_');
        var dados = (opcoes && opcoes.text) || '';
        var codificado = btoa(unescape(encodeURIComponent(dados)));
        return plugin('Filesystem').writeFile({ path: nome, data: codificado, directory: 'DOCUMENTS' })
          .then(function (gravado) { return gravado.uri; });
      },
      openExternal: abrirExterno,
      openDocument: abrirExterno,
      notify: function (opcoes) {
        var notificacoes = plugin('LocalNotifications');
        return notificacoes.requestPermissions().then(function (permissao) {
          if (!permissao.granted) throw new Error('Permissão de notificação negada.');
          return notificacoes.schedule({
            id: (opcoes && opcoes.id) || Date.now() % 2147483647,
            title: (opcoes && opcoes.title) || 'AGROTAX',
            body: (opcoes && opcoes.body) || '',
            schedule: { at: new Date(Date.now() + 1000) }
          });
        });
      },
      networkStatus: function () { return plugin('Network').getStatus(); },
      getPreference: function (chave) { return plugin('Preferences').get({ key: chave }); },
      setPreference: function (chave, valor) { return plugin('Preferences').set({ key: chave, value: valor }); },
      logout: function () {
        try { sessionStorage.removeItem('agrotax-token-admin'); } catch (e) {}
        location.href = '/';
      },
      toast: toast
    };
  }

  function iniciar() {
    instalarConexao();
    instalarFetch();
    instalarLinks();
    instalarDownload();
    instalarNavegacao();
    instalarBridge();
    document.dispatchEvent(new CustomEvent('agrotax:ready', { detail: { plataforma: 'android' } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
