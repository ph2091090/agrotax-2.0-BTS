const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const raizProjeto = path.resolve(raiz, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

test('configuração usa a URL oficial documentada no README original', () => {
  const config = JSON.parse(ler('shared/config/app.config.json'));
  const readme = fs.readFileSync(path.join(raizProjeto, 'README.md'), 'utf8');
  assert.equal(config.productionUrl, 'https://agrotax.onrender.com');
  assert.ok(readme.includes(config.productionUrl));
});

test('pacote Android é br.com.agrotax.app', () => {
  const config = JSON.parse(ler('capacitor.config.json'));
  assert.equal(config.appId, 'br.com.agrotax.app');
  assert.equal(config.appName, 'AGROTAX');
  assert.equal(config.server.url, 'https://agrotax.onrender.com');
  assert.match(ler('android/app/build.gradle'), /applicationId "br\.com\.agrotax\.app"/);
});

test('MainActivity aplica CSS e JS adaptativos e trata erro de conexão', () => {
  const codigo = ler('android/app/src/main/java/br/com/agrotax/app/MainActivity.java');
  assert.match(codigo, /addWebViewListener/);
  assert.match(codigo, /evaluateJavascript/);
  assert.match(codigo, /onBackPressed/);
  assert.match(codigo, /avisarSemConexao/);
});

test('adapter mobile expõe câmera, galeria, arquivos, compartilhamento e notificações', () => {
  const js = ler('shared/mobile/adapter.js');
  for (const nome of ['pickImage', 'shareFile', 'downloadText', 'openExternal', 'openDocument', 'notify', 'networkStatus', 'logout']) {
    assert.ok(js.includes(nome + ':'), 'método ausente: ' + nome);
  }
});

test('Electron mantém isolamento, sandbox e desativa nodeIntegration', () => {
  const main = ler('windows/main.js');
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /sandbox: true/);
  assert.match(main, /webSecurity: true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /will-navigate/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(main, /safeStorage/);
  assert.doesNotMatch(main, /app\.getPath\('resources'\)/);
  assert.match(main, /process\.resourcesPath/);
  assert.match(main, /appendSwitch\('disable-gpu'\)/);
});

test('preload usa contextBridge e não expõe require', () => {
  const preload = ler('windows/preload.js');
  assert.match(preload, /contextBridge\.exposeInMainWorld/);
  assert.doesNotMatch(preload, /exposeInMainWorld\(['"]electron/);
});

test('assets visuais foram gerados com assinaturas válidas', () => {
  const ico = fs.readFileSync(path.join(raiz, 'assets/icons/agrotax.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const png = fs.readFileSync(path.join(raiz, 'assets/branding/agrotax-icon-1024.png'));
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1024);
});

test('originais do site não foram modificados pelo empacotamento', () => {
  const original = fs.readFileSync(path.join(raizProjeto, 'front-end/js/utilitarios.js'), 'utf8');
  const copia = fs.readFileSync(path.join(raiz, 'backup/config/app.js'), 'utf8');
  assert.ok(original.includes("/api"));
  assert.ok(copia.includes("express.static(path.join(raizProjeto, 'front-end'))"));
  const backup = fs.readFileSync(path.join(raiz, 'backup/front-end/index.html'), 'utf8');
  assert.equal(backup, fs.readFileSync(path.join(raizProjeto, 'front-end/index.html'), 'utf8'));
});

test('sem segredos embutidos nos fontes dos aplicativos', () => {
  const arquivos = [
    'shared/config/app.config.json',
    'windows/main.js',
    'windows/preload.js',
    'android/app/src/main/java/br/com/agrotax/app/MainActivity.java',
  ];
  for (const arquivo of arquivos) {
    const conteudo = ler(arquivo);
    assert.doesNotMatch(conteudo, /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/);
    assert.doesNotMatch(conteudo, /TOKEN_ADMIN\s*=\s*['"][^'"]{8,}/);
  }
});

test('build Windows não depende de Wine e gera portátil + instalador', () => {
  const pkg = JSON.parse(ler('package.json'));
  assert.deepEqual(pkg.build.win.target, [{ target: 'portable', arch: ['x64'] }]);
  assert.equal(pkg.build.win.signAndEditExecutable, false);
  const codigo = ler('scripts/build-windows.js');
  assert.ok(codigo.includes('Agrotax.exe'));
  assert.ok(codigo.includes('Agrotax-Setup.exe'));
});

test('marcação de PE e instalador usam ferramentas locais', () => {
  const marcacao = ler('scripts/mark-exe.js');
  const instalador = ler('scripts/make-installer.js');
  assert.match(marcacao, /await import\('resedit'\)/);
  assert.match(marcacao, /replaceIconsForResource/);
  assert.match(marcacao, /setProductVersion/);
  assert.match(instalador, /\.toolchain\/nsis/);
  assert.match(instalador, /makensis/);
  assert.match(instalador, /Section "Uninstall"/);
});

test('build Linux gera .deb e AppImage com metadados oficiais', () => {
  const pkg = JSON.parse(ler('package.json'));
  assert.deepEqual(pkg.build.linux.target, [
    { target: 'deb', arch: ['x64'] },
    { target: 'AppImage', arch: ['x64'] },
  ]);
  assert.equal(pkg.build.linux.maintainer, 'AgroTax');
  assert.equal(pkg.homepage, 'https://agrotax.onrender.com');
  const codigo = ler('scripts/build-linux.js');
  assert.ok(codigo.includes('Agrotax.deb'));
  assert.ok(codigo.includes('Agrotax.AppImage'));
  assert.ok(codigo.includes('Agrotax-Linux'));
  assert.ok(codigo.includes('Agrotax-Portable'));
});

test('Electron usa ícones PNG no Linux e informa a plataforma real', () => {
  const png = fs.readFileSync(path.join(raiz, 'assets/linux/512x512.png'));
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 512);
  const main = ler('windows/main.js');
  const preload = ler('windows/preload.js');
  assert.match(main, /assets\/branding\/agrotax-icon-512\.png/);
  assert.match(main, /plataforma: process\.platform/);
  assert.match(preload, /const plataforma =/);
});
