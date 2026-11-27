// Saída de informações: o usuário leva o resultado da simulação para fora do site.
// CSV (abre no Excel), impressão/PDF e copiar como texto. Tudo no navegador, sem enviar nada a servidor.
import { t, textoServidor, locale } from './i18n.js';

const ROTULOS = { ICMS: 'ICMS', IPI: 'IPI', PIS: 'PIS', COFINS: 'COFINS', FUNRURAL: 'Funrural', SENAR: 'SENAR' };

const reais = (centavos) => (Number(centavos) / 100).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 });

// Mesma proteção do servidor: texto que começa com = + - @ vira texto, nunca fórmula.
const celula = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function resultadoParaCsv(r) {
  const linhas = [
    [t('exp.col_tributo'), t('exp.col_aliquota'), t('exp.col_valor')],
    ...r.tributos.map((x) => [ROTULOS[x.tributo] || x.tributo, pct(x.aliquota), reais(x.valorCentavos)]),
    [t('exp.total'), pct(r.cargaTributaria), reais(r.totalCentavos)],
  ];
  const cabecalho = [
    [t('calc.produto'), textoServidor(r.produto.nome)],
    [t('calc.regime'), textoServidor(r.regimeTributario)],
    [t('calc.operacao'), textoServidor(r.tipoOperacao)],
    [t('calc.valor'), reais(r.valorCentavos)],
    [],
  ];
  return '\uFEFF' + [...cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

export function resultadoParaTexto(r) {
  const linhas = r.tributos.map((x) => `${ROTULOS[x.tributo] || x.tributo} (${pct(x.aliquota)}%): R$ ${reais(x.valorCentavos)}`);
  return [
    `AgroTax — ${textoServidor(r.produto.nome)} · ${textoServidor(r.regimeTributario)} · ${textoServidor(r.tipoOperacao)}`,
    `${t('calc.valor')}: ${reais(r.valorCentavos)}`,
    ...linhas,
    `${t('exp.total')}: R$ ${reais(r.totalCentavos)} (${pct(r.cargaTributaria)}%)`,
    t('exp.aviso'),
  ].join('\n');
}

export function baixarCsv(r) {
  const blob = new Blob([resultadoParaCsv(r)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `agrotax-simulacao-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const imprimir = () => window.print();

export async function copiar(r) {
  const texto = resultadoParaTexto(r);
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Navegadores sem permissão da área de transferência: caminho alternativo.
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
