const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { marcaExecutavel } = require('./mark-exe');

const raizApp = path.resolve(__dirname, '..');
const raizProjeto = path.resolve(raizApp, '..');
const saida = path.join(raizApp, 'build/windows');
const cli = path.join(raizApp, 'node_modules/electron-builder/out/cli/cli.js');
const icon = path.join(raizApp, 'assets/icons/agrotax.ico');
const portatil = path.join(saida, 'Agrotax.exe');
const instalador = path.join(saida, 'Agrotax-Setup.exe');

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

fs.mkdirSync(saida, { recursive: true });
for (const arquivo of [portatil, instalador]) {
  fs.rmSync(arquivo, { force: true });
}

const resultado = spawnSync(process.execPath, [cli, '--win', '--x64'], {
  cwd: raizApp,
  stdio: 'inherit',
  env: Object.assign({}, process.env),
});
if (resultado.status !== 0) throw new Error('electron-builder falhou (código ' + resultado.status + ').');

const encontrados = fs.readdirSync(saida).filter((arquivo) => arquivo.toLowerCase().endsWith('.exe'));
if (!encontrados.length) throw new Error('Nenhum .exe portátil foi gerado em ' + saida);
const gerado = path.join(saida, encontrados[0]);
if (gerado !== portatil) fs.copyFileSync(gerado, portatil);

async function main() {
  await marcaExecutavel(portatil, icon, versao);

  const instaladorScript = path.join(raizApp, 'scripts/make-installer.js');
  const resultadoInstalador = spawnSync(process.execPath, [instaladorScript], {
    cwd: raizApp,
    stdio: 'inherit',
    env: Object.assign({}, process.env),
  });
  if (resultadoInstalador.status !== 0) {
    throw new Error('Geração do instalador falhou (código ' + resultadoInstalador.status + ').');
  }

  for (const arquivo of ['Agrotax.exe', 'Agrotax-Setup.exe']) {
    const caminho = path.join(saida, arquivo);
    if (!fs.existsSync(caminho)) throw new Error('Artefato ausente: ' + caminho);
    console.log('[agrotax] ' + path.relative(raizProjeto, caminho));
  }
  console.log('[agrotax] Build Windows concluído.');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
