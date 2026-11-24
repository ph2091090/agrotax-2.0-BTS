# Qualidade do software e saída de informações

Esta pasta é o **ponto de entrada para a avaliação**: ela mostra, em um só lugar, onde está cada um dos
quatro itens pedidos, como demonstrar cada um em menos de um minuto e quais arquivos do projeto os implementam.
O código continua nas pastas normais (`API/`, `front-end/`) para o sistema funcionar; aqui ficam os mapas, as
explicações e os arquivos de portabilidade (Docker).

| # | Item | Resumo | Onde está o código | Como mostrar |
|---|------|--------|--------------------|--------------|
| 1 | **UI e UX** | Tema claro/escuro, layout responsivo, acessibilidade, estados de carregamento e erro, **exportar/imprimir o resultado** | `front-end/` (`index.html`, `css/estilo.css`, `js/tema.js`, `js/exportar.js`) | [01-ui-ux](01-ui-ux/README.md) |
| 2 | **Tradução** | Português e espanhol: interface, mensagens da API, produtos e guia fiscal; moeda e números no formato do idioma | `front-end/js/i18n.js`, `API/src/utilitarios/i18n.js`, `API/src/middlewares/idioma.js` | [02-traducao](02-traducao/README.md) |
| 3 | **Portabilidade** | Roda com 1 clique (`iniciar.*`), manualmente ou em **Docker**; configuração por `.env`; banco em arquivo único | `iniciar.bat/.sh/.command`, `API/.env.example`, `03-portabilidade/` | [03-portabilidade](03-portabilidade/README.md) |
| 4 | **Registro de acesso/dados** | Cada acesso gravado no banco (sem IP), painel com números, **exportação CSV** de acessos, simulações e contatos, retenção automática | `API/src/registro-acesso/`, `front-end/admin.html`, `API/src/utilitarios/csv.js` | [04-registro-de-acesso](04-registro-de-acesso/README.md) |

Para ensaiar a apresentação: [ROTEIRO_DE_APRESENTACAO.md](ROTEIRO_DE_APRESENTACAO.md) (passo a passo + perguntas
que o professor pode fazer e as respostas).

## O que é novo nesta versão (2.1.0) e o que já existia

| Já existia antes | Foi acrescentado agora |
|---|---|
| Tradução PT/ES completa (interface e API) | Textos dos novos botões em PT e ES |
| Tema claro/escuro, responsivo, acessibilidade básica | Botões **Baixar CSV / Imprimir (PDF) / Copiar** no resultado e estilo de impressão |
| Log de cada requisição **só no console** | Registro **gravado no banco** (tabela `acessos`), painel `admin.html`, CSVs, retenção de 90 dias |
| Scripts `iniciar.*` e deploy no Render | **Dockerfile + docker-compose**, volume para o banco, health check |
| 22 testes automatizados | +9 testes (registro de acesso e CSV): 31 no total |

## Rodar os testes

```
cd API
npm install
npm test        # 31 testes
```

## Ativar o painel de acessos

1. Em `API/.env`, defina `TOKEN_ADMIN=` com uma senha longa (sem isso a área admin fica desativada de propósito).
2. `cd API && npm start`
3. Abra o site, use um pouco (calcule, troque o idioma) e depois acesse `http://localhost:3000/admin.html`.
