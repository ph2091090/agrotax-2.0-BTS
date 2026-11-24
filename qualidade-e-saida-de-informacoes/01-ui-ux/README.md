# 1. UI e UX (interface e experiência do usuário)

**Onde fica:** `front-end/index.html`, `front-end/css/estilo.css`, `front-end/js/` (`tema.js`, `calculadora.js`, `exportar.js`).

## O que o projeto oferece

| Recurso | Como funciona | Arquivo |
|---|---|---|
| Tema claro e escuro | Botão 🌙 no topo; começa pelo tema do sistema (`prefers-color-scheme`) e lembra a escolha do usuário | `js/tema.js`, `js/tema-inicio.js` |
| Design consistente | Cores, raios e espaçamentos em variáveis CSS (`:root` e `:root[data-tema='escuro']`) | `css/estilo.css` |
| Responsivo | Layout se adapta em telas até 820 px e 560 px (celular) | `css/estilo.css` (`@media`) |
| Acessibilidade | Todos os campos têm `label`; foco visível no teclado; `aria-label` nos grupos; resultado e avisos com `aria-live`; respeita "reduzir movimento" do sistema | `index.html`, `css/estilo.css` |
| Feedback ao usuário | "Carregando produtos…", botão vira "Calculando…" e fica desabilitado; erros e avisos aparecem em aviso na tela (toast), já traduzidos | `js/calculadora.js`, `js/utilitarios.js` |
| Resultado claro | Total em destaque, carga tributária (%), valor líquido, cada tributo com alíquota e observação | `js/calculadora.js` |
| **Saída do resultado (novo)** | **Baixar CSV** (abre no Excel), **Imprimir / PDF** (a impressão mostra só o resultado) e **Copiar** como texto | `js/exportar.js`, `@media print` em `css/estilo.css` |
| Formulário de contato amigável | Aviso de privacidade ao lado do formulário; campo-armadilha invisível contra robôs | `index.html`, `js/contato.js` |

## Como demonstrar (1 minuto)

1. Abra o site e clique no 🌙: o tema muda e continua assim ao recarregar.
2. Diminua a janela do navegador (ou use o modo celular, F12 → ícone de celular): o layout se reorganiza.
3. Aperte `Tab` várias vezes: o foco aparece destacado em cada campo e botão.
4. Faça uma simulação (ex.: Soja, R$ 100000, Produtor Rural PF, Venda) e clique em **Baixar CSV**, **Imprimir / PDF** e **Copiar**.

## O que dizer

"A interface foi pensada para quem não é da área tributária: poucos campos, resultado em destaque, avisos de que
é estimativa e três formas de levar o resultado para fora do site. Também cuidamos de acessibilidade (teclado,
leitores de tela) e de funcionar bem no celular."

## Limitações honestas

- Contraste de cores e leitor de tela não foram auditados com ferramenta (ex.: Lighthouse); vale rodar o Lighthouse do Chrome antes de apresentar.
- O painel `admin.html` está só em português (é área interna).
