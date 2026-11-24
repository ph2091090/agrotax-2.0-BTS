# 2. Tradução para diferentes línguas (internacionalização, i18n)

**Idiomas:** português do Brasil (idioma-fonte) e espanhol. Botões **PT | ES** no topo do site.

## Como está organizado

| Camada | O que traduz | Arquivo |
|---|---|---|
| Interface (front-end) | 91 textos por idioma (títulos, botões, formulário, resultado, exportação) | `front-end/js/i18n.js` (dicionários `PT` e `ES`) |
| Textos vindos da API (front-end) | 42 textos: produtos, regimes, observações das regras, guia fiscal, erros | `front-end/js/i18n.js` (dicionário `SERVIDOR`) |
| API | Os mesmos 42 textos, traduzidos na resposta conforme o cabeçalho `Accept-Language` | `API/src/utilitarios/i18n.js`, `API/src/middlewares/idioma.js` |
| Números e moeda | `toLocaleString` com o locale do idioma: separador decimal, de milhar e posição do símbolo seguem o idioma (PT: `R$ 1.234,56`) | `front-end/js/utilitarios.js` (`dinheiro`, `porcento`) |

Pontos de projeto que valem citar:

- **Nada é traduzido no banco.** O banco guarda sempre em português; a tradução acontece só na resposta. Assim as alíquotas e regras não dependem de idioma.
- **O idioma escolhido é lembrado** (`localStorage`); na primeira visita vale o idioma do navegador; se não for PT nem ES, cai em português.
- Os textos têm **marcação no HTML** (`data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-aria`), então trocar o idioma não recarrega a página.
- O resultado já exibido é **redesenhado** ao trocar o idioma (nada fica "preso" no idioma antigo).
- Os novos botões de exportar e o CSV exportado também seguem o idioma (`exp.*`).

## Como demonstrar

1. Clique em **ES**: a página inteira muda sem recarregar, inclusive o guia fiscal e os nomes dos produtos.
2. Faça uma simulação em espanhol e depois troque para **PT**: o resultado muda de idioma junto.
3. Provoque um erro (clique em calcular sem escolher produto): a mensagem sai no idioma ativo.
4. Teste a API direto: `curl -H "Accept-Language: es" http://localhost:3000/api/produtos` devolve os nomes em espanhol.

## Como adicionar um terceiro idioma (ex.: inglês) — para responder ao professor

1. `front-end/js/i18n.js`: copiar os blocos `ES` e `SERVIDOR` para `EN`, traduzir os valores e acrescentar `'en'` em `IDIOMAS`, em `locale()` (`en-US`) e em `detectar()`.
2. `front-end/index.html`: acrescentar um botão `data-idioma="en"` ao lado de PT e ES.
3. `API/src/utilitarios/i18n.js`: criar o dicionário `EN` e reconhecer `en` em `idiomaRequisicao()`.
4. `front-end/js/utilitarios.js`: enviar `Accept-Language: en` quando o idioma for inglês.

Os testes já existentes (`API/testes/i18n.test.js`) mostram como testar o novo idioma.

## Limitações honestas

- Só há tradução pronta para espanhol, além do português. Os textos em espanhol são uma tradução simples e merecem revisão de falante nativo.
- A moeda continua sendo o real (R$) nos dois idiomas, porque os tributos são brasileiros.
