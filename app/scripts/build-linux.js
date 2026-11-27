const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raizApp = path.resolve(__dirname, '..');
const raizProjeto = path.resolve(raizApp, '..');
const temporaria = path.join(raizApp, 'build/windows');
const saida = path.join(raizApp, 'build/linux');
const cli = path.join(raizApp, 'node_modules/electron-builder/out/cli/cli.js');

fs.mkdirSync(saida, { recursive: true });
for (const arquivo of fs.readdirSync(saida)) {
  if (/\.(deb|appimage|yml)$/i.test(arquivo) || arquivo === 'Agrotax-Linux') {
    fs.rmSync(path.join(saida, arquivo), { force: true });
  }
}
fs.rmSync(path.join(saida, 'Agrotax-Portable'), { recursive: true, force: true });

const resultado = spawnSync(process.execPath, [cli, '--linux', '--x64'], {
  cwd: raizApp,
  stdio: 'inherit',
  env: Object.assign({}, process.env),
});
if (resultado.status !== 0) throw new Error('electron-builder falhou no build Linux (código ' + resultado.status + ').');

const gerados = fs.readdirSync(temporaria).filter((arquivo) => /\.(deb|appimage)$/i.test(arquivo));
const deb = gerados.find((arquivo) => /\.deb$/i.test(arquivo));
const appImage = gerados.find((arquivo) => /\.appimage$/i.test(arquivo));
if (!deb || !appImage) throw new Error('Build Linux não gerou .deb e AppImage em ' + temporaria);

const move = (origem, nome) => {
  const destino = path.join(saida, nome);
  fs.copyFileSync(path.join(temporaria, origem), destino);
  fs.rmSync(path.join(temporaria, origem), { force: true });
  console.log('[agrotax] ' + path.relative(raizProjeto, destino));
};

move(deb, 'Agrotax.deb');
move(appImage, 'Agrotax.AppImage');

const portavel = path.join(saida, 'Agrotax-Portable');
fs.cpSync(path.join(temporaria, 'linux-unpacked'), portavel, { recursive: true });
const lancador = path.join(saida, 'Agrotax-Linux');
fs.writeFileSync(lancador, [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  'BASE="$(cd "$(dirname "$0")" && pwd)"',
  'exec "$BASE/Agrotax-Portable/agrotax-apps" --disable-gpu --disable-dev-shm-usage "$@"',
  '',
].join('\n'), { mode: 0o755 });
console.log('[agrotax] ' + path.relative(raizProjeto, lancador));

const yml = path.join(temporaria, 'latest-linux.yml');
if (fs.existsSync(yml)) {
  fs.copyFileSync(yml, path.join(saida, 'latest-linux.yml'));
  fs.rmSync(yml, { force: true });
}
console.log('[agrotax] Build Linux concluído.');
