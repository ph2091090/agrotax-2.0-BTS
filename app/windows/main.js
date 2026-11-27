const path = require('path');
const fs = require('fs');
const net = require('net');
const { app, BrowserWindow, Menu, Notification, ipcMain, session, shell, dialog } = require('electron');

if (process.platform === 'linux' && app.isPackaged) {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

const raizApp = path.resolve(__dirname, '..');
const arquivoConfig = path.join(process.resourcesPath, 'config', 'app.config.json');

function lerConfig() {
  const locais = [arquivoConfig, path.join(raizApp, 'shared/config/app.config.json')];
  for (const local of locais) {
    try { return JSON.parse(fs.readFileSync(local, 'utf8')); } catch (e) { /* tenta o próximo */ }
  }
  return {
    productionUrl: 'https://agrotax.onrender.com',
    developmentUrl: 'http://localhost:3000',
    environment: 'production',
    externalLinkAllowlist: [],
  };
}

const config = lerConfig();
const urlBase = process.env.AGROTAX_URL || (config.environment === 'development' ? config.developmentUrl : config.productionUrl);
const origemBase = new URL(urlBase).origin;
const dirDados = app.getPath('userData');
const arquivoSessao = path.join(dirDados, 'sessao.json');
const arquivoJanela = path.join(dirDados, 'janela.json');

function iconeAplicativo() {
  const candidatos = process.platform === 'linux'
    ? [path.join(raizApp, 'assets/branding/agrotax-icon-512.png'), path.join(raizApp, 'assets/linux/512x512.png')]
    : [path.join(raizApp, 'assets/icons/agrotax.ico')];
  return candidatos.find((caminho) => fs.existsSync(caminho));
}

const icone = iconeAplicativo();

let janela = null;
let splash = null;
let cacheSessao = {};

function carregarSessao() {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivoSessao, 'utf8'));
    cacheSessao = dados && typeof dados === 'object' ? dados : {};
  } catch (e) {
    cacheSessao = {};
  }
}

function descriptografar(valor) {
  if (typeof valor !== 'string') return '';
  if (valor.startsWith('enc:') && safeStorageDisponivel()) {
    try { return safeStorage().decryptString(Buffer.from(valor.slice(4), 'base64')).toString('utf8'); } catch (e) { return ''; }
  }
  return '';
}

function safeStorageDisponivel() {
  try { return require('electron').safeStorage.isEncryptionAvailable(); } catch (e) { return false; }
}

function safeStorage() {
  return require('electron').safeStorage;
}

function lerValorSessao(chave) {
  return descriptografar(cacheSessao[chave]);
}

function gravarValorSessao(chave, valor) {
  if (!safeStorageDisponivel()) {
    console.warn('[AgroTax] Criptografia do sistema indisponível; token não persistido.');
    return false;
  }
  const cifrado = 'enc:' + safeStorage().encryptString(String(valor)).toString('base64');
  cacheSessao[chave] = cifrado;
  fs.mkdirSync(dirDados, { recursive: true });
  fs.writeFileSync(arquivoSessao, JSON.stringify(cacheSessao), { mode: 0o600 });
  return true;
}

function removerValorSessao(chave) {
  delete cacheSessao[chave];
  try { fs.writeFileSync(arquivoSessao, JSON.stringify(cacheSessao), { mode: 0o600 }); } catch (e) { /* ignora */ }
}

function ipPrivado(host) {
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1\]?$)/i.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  const ip = net.isIP(host.replace(/^\[|\]$/g, ''));
  if (ip === 4) {
    const octetos = host.split('.').map(Number);
    return octetos[0] === 0 || octetos[0] >= 224;
  }
  return false;
}

function urlSegura(endereco) {
  try {
    const u = new URL(endereco);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.username || u.password) return null;
    if (ipPrivado(u.hostname) && u.origin !== origemBase) return null;
    if (u.port && !['80', '443', '3000'].includes(u.port) && u.origin !== origemBase) return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function abrirExterno(endereco) {
  const segura = urlSegura(endereco);
  if (!segura) return Promise.resolve(false);
  return shell.openExternal(segura, { activate: true }).then(() => true).catch(() => false);
}

function carregarJanela() {
  try {
    const estado = JSON.parse(fs.readFileSync(arquivoJanela, 'utf8'));
    return {
      width: Number(estado.width) || 1280,
      height: Number(estado.height) || 800,
      x: Number.isFinite(estado.x) ? estado.x : undefined,
      y: Number.isFinite(estado.y) ? estado.y : undefined,
      maximized: Boolean(estado.maximized),
    };
  } catch (e) {
    return { width: 1280, height: 800 };
  }
}

function salvarJanela() {
  if (!janela || janela.isDestroyed()) return;
  const estado = janela.isMaximized()
    ? { maximized: true, width: 1280, height: 800 }
    : { maximized: false, ...janela.getBounds() };
  try { fs.writeFileSync(arquivoJanela, JSON.stringify(estado)); } catch (e) { /* ignora */ }
}

function criarSplash() {
  splash = new BrowserWindow({
    width: 460,
    height: 320,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#2f8f5b',
    icon: icone,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
}

function criarJanela() {
  const estado = carregarJanela();
  janela = new BrowserWindow({
    ...estado,
    minWidth: 880,
    minHeight: 600,
    show: false,
    title: 'AGROTAX',
    icon: icone,
    backgroundColor: '#f6faf7',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: false,
    },
  });

  const conteudo = janela.webContents;
  conteudo.once('did-finish-load', () => {
    if (estado.maximized) janela.maximize();
    janela.show();
    janela.focus();
    if (splash && !splash.isDestroyed()) { splash.close(); splash = null; }
  });
  conteudo.on('did-fail-load', (evento, codigo, descricao) => {
    if (codigo === -3) return;
    if (splash && !splash.isDestroyed()) splash.close();
    if (!janela.isVisible()) janela.show();
    janela.loadFile(path.join(__dirname, 'offline.html'), { query: { url: urlBase, erro: String(codigo) + ' ' + descricao } });
  });
  conteudo.setWindowOpenHandler(({ url }) => {
    abrirExterno(url);
    return { action: 'deny' };
  });
  conteudo.on('will-navigate', (evento, destino) => {
    if (new URL(destino).origin === origemBase) return;
    evento.preventDefault();
    abrirExterno(destino);
  });

  janela.on('close', salvarJanela);
  janela.on('closed', () => { janela = null; });
  janela.loadURL(urlBase);
}

function configurarSessao() {
  const padrao = session.defaultSession;
  padrao.setPermissionRequestHandler((webContents, permissao, callback) => {
    callback(['clipboard-read', 'clipboard-write'].includes(permissao));
  });
  padrao.on('will-download', (evento, item) => {
    const destino = path.join(app.getPath('downloads'), item.getFilename().replace(/[^\w.-]/g, '_'));
    item.setSavePath(destino);
    item.once('done', (evento, estado) => {
      if (estado === 'completed') {
        new Notification({ title: 'AGROTAX', body: 'Download concluído: ' + path.basename(destino), icon: icone }).show();
      }
    });
  });
}

function configurarMenu() {
  const modelo = [
    {
      label: 'Aplicativo',
      submenu: [
        { label: 'Sobre o AGROTAX', click: () => {
          dialog.showMessageBox(janela, {
            type: 'info',
            title: 'AGROTAX',
            message: 'AGROTAX ' + app.getVersion(),
            detail: 'Este aplicativo utiliza a mesma API e o mesmo banco de dados do site AgroTax.\nServidor: ' + urlBase,
          });
        } },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Navegação',
      submenu: [
        { label: 'Início', accelerator: 'Alt+1', click: () => navegarPara('#inicio') },
        { label: 'Calculadora', accelerator: 'Alt+2', click: () => navegarPara('#calculadora') },
        { label: 'Guia fiscal', accelerator: 'Alt+3', click: () => navegarPara('#guia') },
        { label: 'Painel administrativo', accelerator: 'Alt+4', click: () => irPara('/admin.html') },
        { type: 'separator' },
        { label: 'Imprimir resultado', accelerator: 'CmdOrCtrl+P', click: () => janela && janela.webContents.print({ printBackground: true }) },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar', accelerator: 'CmdOrCtrl+R' },
        { role: 'togglefullscreen', label: 'Tela inteira', accelerator: 'F11' },
        { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor', visible: !app.isPackaged },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo));
}

function navegarPara(hash) {
  if (!janela || janela.isDestroyed()) return;
  janela.webContents.send('agrotax:navegar', hash);
}

function irPara(caminho) {
  if (!janela || janela.isDestroyed()) return;
  janela.loadURL(new URL(caminho, urlBase).href);
}

function registrarIpc() {
  ipcMain.on('agrotax:session:getSync', (evento, chave) => { evento.returnValue = lerValorSessao(chave); });
  ipcMain.handle('agrotax:session:set', (evento, chave, valor) => gravarValorSessao(chave, valor));
  ipcMain.handle('agrotax:session:remove', (evento, chave) => { removerValorSessao(chave); return true; });
  ipcMain.handle('agrotax:abrirExterno', (evento, endereco) => abrirExterno(endereco));
  ipcMain.handle('agrotax:notificar', (evento, opcoes) => {
    const dados = opcoes || {};
    const nota = new Notification({
      title: String(dados.title || 'AGROTAX').slice(0, 120),
      body: String(dados.body || '').slice(0, 400),
      icon: icone,
    });
    nota.show();
    return true;
  });
  ipcMain.handle('agrotax:salvarTexto', async (evento, opcoes) => {
    const dados = opcoes || {};
    const nome = String(dados.filename || 'agrotax-exportacao.txt').replace(/[^\w.-]/g, '_');
    const resposta = await dialog.showSaveDialog(janela, {
      title: 'Salvar arquivo do AgroTax',
      defaultPath: path.join(app.getPath('documents'), nome),
      filters: [{ name: 'Arquivos', extensions: ['csv', 'txt', 'json'] }],
    });
    if (resposta.canceled || !resposta.filePath) return null;
    fs.writeFileSync(resposta.filePath, String(dados.text || ''), 'utf8');
    return resposta.filePath;
  });
  ipcMain.handle('agrotax:abrirArquivo', (evento, arquivo) => {
    if (typeof arquivo !== 'string' || !fs.existsSync(arquivo)) return false;
    shell.openPath(arquivo);
    return true;
  });
  ipcMain.handle('agrotax:info', () => ({
    versao: app.getVersion(),
    servidor: urlBase,
    plataforma: process.platform,
    atualizacoes: config.updateUrl ? { configurada: true } : { configurada: false, motivo: 'Nenhuma URL de atualização foi configurada.' },
  }));
  ipcMain.on('agrotax:cssSync', (evento) => {
    evento.returnValue = fs.readFileSync(path.join(raizApp, 'shared/css/app-adapter.css'), 'utf8');
  });
  ipcMain.handle('agrotax:navegarAdmin', () => { irPara('/admin.html'); return true; });
  ipcMain.handle('agrotax:navegarHome', () => { irPara('/'); return true; });
  ipcMain.handle('agrotax:imprimir', () => { if (janela) janela.webContents.print({ printBackground: true }); return true; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
  });

  app.whenReady().then(() => {
    carregarSessao();
    configurarSessao();
    configurarMenu();
    registrarIpc();
    criarSplash();
    criarJanela();
  });

  app.on('window-all-closed', () => app.quit());
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
}
