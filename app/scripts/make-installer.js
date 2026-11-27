const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { marcaExecutavel } = require('./mark-exe');

const raizApp = path.resolve(__dirname, '..');
const raizProjeto = path.resolve(raizApp, '..');
const saida = path.join(raizApp, 'build/windows');
const payload = path.join(saida, 'payload');
const desempacotado = path.join(saida, 'win-unpacked');
const script = path.join(saida, 'agrotax-setup.nsi');
const instalador = path.join(saida, 'Agrotax-Setup.exe');
const icon = path.join(raizApp, 'assets/icons/agrotax.ico');
const nsis = path.join(raizApp, '.toolchain/nsis');
const makensis = path.join(nsis, 'usr/bin/makensis');
const nsisShare = path.join(nsis, 'usr/share');

const versao = {
  maior: 2,
  menor: 1,
  patch: 0,
  texto: '2.1.0.0',
  empresa: 'AgroTax',
  produto: 'AGROTAX',
  descricao: 'AGROTAX - aplicativo desktop',
  nomeInterno: 'Agrotax',
  copyright: 'Copyright (c) 2026 AgroTax',
};

function prepararPayload() {
  fs.rmSync(payload, { recursive: true, force: true });
  fs.mkdirSync(payload, { recursive: true });
  fs.cpSync(desempacotado, payload, { recursive: true });
  const original = path.join(payload, 'AGROTAX.exe');
  const renomeado = path.join(payload, 'Agrotax.exe');
  if (fs.existsSync(original)) fs.renameSync(original, renomeado);
  if (!fs.existsSync(renomeado)) throw new Error('Executável não encontrado em win-unpacked.');
  return renomeado;
}

function gerarScript() {
  const conteudo = [
    'Unicode true',
    'SetCompressor /SOLID lzma',
    'Name "AGROTAX 2.1.0"',
    'OutFile "' + instalador + '"',
    'InstallDir "$LOCALAPPDATA\\AGROTAX"',
    'RequestExecutionLevel user',
    'Icon "' + icon + '"',
    'UninstallIcon "' + icon + '"',
    'Page directory',
    'Page instfiles',
    'UninstPage uninstConfirm',
    'UninstPage instfiles',
    '',
    'Section "Instalar"',
    '  SetOutPath $INSTDIR',
    '  File /r "' + payload + '\\*"',
    '  WriteUninstaller "$INSTDIR\\Uninstall.exe"',
    '  CreateDirectory "$SMPROGRAMS\\AGROTAX"',
    '  CreateShortcut "$SMPROGRAMS\\AGROTAX\\AGROTAX.lnk" "$INSTDIR\\Agrotax.exe" "" "$INSTDIR\\Agrotax.exe" 0',
    '  CreateShortcut "$DESKTOP\\AGROTAX.lnk" "$INSTDIR\\Agrotax.exe" "" "$INSTDIR\\Agrotax.exe" 0',
    '  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX" "DisplayName" "AGROTAX 2.1.0"',
    '  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX" "UninstallString" "$INSTDIR\\Uninstall.exe"',
    '  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX" "DisplayIcon" "$INSTDIR\\Agrotax.exe,0"',
    '  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX" "Publisher" "AgroTax"',
    '  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX" "DisplayVersion" "2.1.0"',
    'SectionEnd',
    '',
    'Section "Uninstall"',
    '  Delete "$DESKTOP\\AGROTAX.lnk"',
    '  Delete "$SMPROGRAMS\\AGROTAX\\AGROTAX.lnk"',
    '  RMDir "$SMPROGRAMS\\AGROTAX"',
    '  DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AGROTAX"',
    '  Delete "$INSTDIR\\Uninstall.exe"',
    '  RMDir /r "$INSTDIR"',
    'SectionEnd',
    '',
  ].join('\n');
  fs.writeFileSync(script, conteudo, 'utf8');
}

function compilar() {
  const args = [
    '--ro-bind', '/', '/',
    '--bind', nsisShare, '/usr/share',
    '--bind', raizProjeto, raizProjeto,
    '--bind', '/tmp', '/tmp',
    '--',
    makensis,
    script,
  ];
  const resultado = spawnSync('bwrap', args, {
    cwd: raizApp,
    stdio: 'inherit',
    env: Object.assign({}, process.env, { LC_ALL: 'C.UTF-8' }),
  });
  if (resultado.status !== 0) throw new Error('makensis falhou (código ' + resultado.status + ').');
  if (!fs.existsSync(instalador)) throw new Error('Instalador não foi gerado: ' + instalador);
  return marcaExecutavel(instalador, icon, versao).then(() => {
    console.log('[agrotax] ' + path.relative(raizProjeto, instalador));
  });
}

async function main() {
  if (!fs.existsSync(desempacotado)) throw new Error('Pasta win-unpacked não encontrada.');
  if (!fs.existsSync(makensis)) throw new Error('NSIS local não encontrado em ' + nsis);
  const exe = prepararPayload();
  await marcaExecutavel(exe, icon, versao);
  gerarScript();
  await compilar();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
