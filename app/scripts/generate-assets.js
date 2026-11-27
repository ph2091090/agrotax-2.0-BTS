const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const raiz = path.resolve(__dirname, '..');
const tabelaCrc = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) c = tabelaCrc[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const cabecalho = Buffer.alloc(8);
  cabecalho.writeUInt32BE(dados.length, 0);
  cabecalho.write(tipo, 4, 4, 'ascii');
  const corpo = Buffer.concat([cabecalho.subarray(4), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([cabecalho, dados, crc]);
}

function png(largura, altura, pixel) {
  const linha = largura * 4;
  const bruto = Buffer.alloc((linha + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const inicio = y * (linha + 1);
    bruto[inicio] = 0;
    for (let x = 0; x < largura; x++) {
      const c = pixel(x, y, largura, altura);
      const p = inicio + 1 + x * 4;
      bruto[p] = c[0]; bruto[p + 1] = c[1]; bruto[p + 2] = c[2]; bruto[p + 3] = c[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

const VERDE = [47, 143, 91];
const BRANCO = [255, 255, 255];
const TRANSPARENTE = [0, 0, 0, 0];

function dentroRetanguloArredondado(x, y, t, raio) {
  const rx = Math.min(Math.max(x, raio), t - raio);
  const ry = Math.min(Math.max(y, raio), t - raio);
  const dx = x - rx, dy = y - ry;
  return dx * dx + dy * dy <= raio * raio;
}

function dentroElipse(x, y, cx, cy, rx, ry, angulo) {
  const c = Math.cos(angulo), s = Math.sin(angulo);
  const dx = x - cx, dy = y - cy;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
}

function broto(x, y, t, escala = 1) {
  const cx = t / 2;
  const cy = t * 0.52;
  const espessura = t * 0.026 * escala;
  const haste = Math.abs(x - cx) <= espessura && y >= cy - t * 0.12 && y <= t * 0.74;
  const folhaEsq = dentroElipse(x, y, cx - t * 0.105, cy + t * 0.02, t * 0.135 * escala, t * 0.062 * escala, -0.55);
  const folhaDir = dentroElipse(x, y, cx + t * 0.105, cy - t * 0.055, t * 0.135 * escala, t * 0.062 * escala, 0.55);
  return haste || folhaEsq || folhaDir;
}

function icone(t, { transparente = false, circular = false } = {}) {
  return png(t, t, (x, y) => {
    const dentro = circular
      ? Math.hypot(x - t / 2 + 0.5, y - t / 2 + 0.5) <= t / 2
      : dentroRetanguloArredondado(x, y, t, t * 0.22);
    if (!dentro) return TRANSPARENTE;
    if (!transparente && broto(x, y, t)) return [...BRANCO, 255];
    if (transparente) return [...BRANCO, 255];
    return [...VERDE, 255];
  });
}

function foreground(t) {
  return png(t, t, (x, y) => broto(x, y, t, 0.92) ? [...BRANCO, 255] : TRANSPARENTE);
}

function background(t) {
  return png(t, t, () => [...VERDE, 255]);
}

function splash(t) {
  return png(t, t, (x, y) => {
    const raio = Math.min(t * 0.12, 180);
    const dentro = dentroRetanguloArredondado(x - t * 0.36, y - t * 0.34, t * 0.28, raio);
    if (dentro && broto(x - t * 0.36, y - t * 0.34, t * 0.28)) return [...BRANCO, 255];
    return [...VERDE, 255];
  });
}

function ico(tamanhos) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(tamanhos.length, 4);
  let offset = 6 + tamanhos.length * 16;
  const entradas = [];
  const imagens = [];
  for (const t of tamanhos) {
    const dados = icone(t);
    const entrada = Buffer.alloc(16);
    entrada[0] = t >= 256 ? 0 : t;
    entrada[1] = t >= 256 ? 0 : t;
    entrada[2] = 0; entrada[3] = 0;
    entrada.writeUInt16LE(1, 4);
    entrada.writeUInt16LE(32, 6);
    entrada.writeUInt32LE(dados.length, 8);
    entrada.writeUInt32LE(offset, 12);
    entradas.push(entrada);
    imagens.push(dados);
    offset += dados.length;
  }
  return Buffer.concat([cabecalho, ...entradas, ...imagens]);
}

function salvar(arquivo, dados) {
  const destino = path.join(raiz, arquivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, dados);
  console.log('  ' + arquivo + ' (' + Math.round(dados.length / 1024) + ' KB)');
}

console.log('[agrotax] Gerando identidade visual a partir do verde #2f8f5b e do broto do favicon original.');
salvar('assets/branding/agrotax-icon-1024.png', icone(1024));
salvar('assets/branding/agrotax-icon-512.png', icone(512));
salvar('assets/branding/agrotax-tray.png', icone(32));
salvar('assets/icons/agrotax.ico', ico([16, 24, 32, 48, 64, 128, 256]));
for (const t of [16, 32, 48, 64, 128, 256, 512]) {
  salvar(`assets/linux/${t}x${t}.png`, icone(t));
}
salvar('assets/splash/agrotax-splash.png', splash(1600));

const res = 'android/app/src/main/res';
const densidades = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [densidade, t] of Object.entries(densidades)) {
  salvar(`${res}/mipmap-${densidade}/ic_launcher.png`, icone(t));
  salvar(`${res}/mipmap-${densidade}/ic_launcher_round.png`, icone(t, { circular: true }));
  salvar(`${res}/mipmap-${densidade}/ic_launcher_foreground.png`, foreground(Math.round(t * 2.25)));
}
const adaptativas = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 270, xxxhdpi: 324 };
for (const [densidade, t] of Object.entries(adaptativas)) {
  salvar(`${res}/mipmap-${densidade}/ic_launcher_background.png`, background(t));
}
salvar(`${res}/drawable/splash.png`, splash(2732));
salvar('shared/web/mobile/splash.png', splash(600));
console.log('[agrotax] Assets concluídos.');
