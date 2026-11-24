// Gera CSV seguro para abrir no Excel/LibreOffice.
// - Separador ";" e BOM UTF-8: o Excel em português/espanhol abre com acentos e colunas certas.
// - Neutraliza "injeção de fórmula": texto digitado por visitantes (ex.: nome no formulário de contato)
//   que começa com = + - @ seria executado como fórmula; o apóstrofo na frente impede isso.

function celula(valor) {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function gerarCsv(colunas, linhas) {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celula(l[c.chave])).join(';'));
  return '\uFEFF' + [cabecalho, ...corpo].join('\r\n') + '\r\n';
}

module.exports = { gerarCsv, celula };
