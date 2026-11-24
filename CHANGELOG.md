# Changelog

Formato baseado em *Keep a Changelog*; versionamento semântico (maior.menor.correção).

## [2.1.0] — 2026-11-23

### Adicionado
- Registro de acesso gravado no banco (tabela `acessos`), sem IP (só hash com sal), com retenção configurável (`DIAS_RETENCAO_REGISTROS`, padrão 90 dias). Código em `API/src/registro-acesso/`.
- Área administrativa: `front-end/admin.html` (painel) e rotas `GET /api/admin/acessos`, `/api/admin/acessos.csv`, `/api/admin/simulacoes.csv`, `/api/admin/leads.csv` (exigem `TOKEN_ADMIN`).
- Exportação CSV segura (BOM, separador `;`, neutralização de injeção de fórmula): `API/src/utilitarios/csv.js`.
- Saída do resultado da simulação: Baixar CSV, Imprimir/PDF e Copiar (`front-end/js/exportar.js`), com textos em PT e ES e estilo de impressão.
- Docker: `qualidade-e-saida-de-informacoes/03-portabilidade/` (Dockerfile e docker-compose) e `.dockerignore`.
- Pasta `qualidade-e-saida-de-informacoes/` com o mapa dos itens de avaliação e o roteiro de apresentação.
- 9 testes automatizados (`API/testes/registroAcesso.test.js`); total de 31.

### Alterado
- `middlewares/registroRequisicoes.js` agora apenas reexporta `registro-acesso/middleware.js` (continua escrevendo no console e também grava no banco).
- Novas variáveis de ambiente: `SAL_REGISTRO` e `DIAS_RETENCAO_REGISTROS`.

### Removido
- Arquivos soltos que não pertencem ao projeto: `pt. json` (vazio), `.~lock.AgroTax jenpex.odt#` e `API/build/` (resíduos do LibreOffice e do node-gyp); `.gitignore` atualizado para não voltarem.

## [2.0.0] — 2026-10-04

### Adicionado
- Banco de dados SQLite: `produtos`, `regras_tributarias` (versionadas por data), `simulacoes` e `leads`, com chaves estrangeiras, `CHECK`, índice e carga inicial idempotente.
- API REST em camadas (rotas, controladores, serviços, modelos) com 7 endpoints.
- Motor tributário em função pura, cálculo em centavos inteiros.
- Guia Fiscal alimentado pelo banco e formulário de contato funcional.
- Segurança: validação no servidor, SQL parametrizado, CSP e demais cabeçalhos, limite de requisições por IP, CORS restrito, token administrativo, honeypot, escape contra XSS.
- 16 testes automatizados (`npm test`).
- Scripts `iniciar.bat`, `iniciar.sh` e `iniciar.command`.
- Documentação completa em `documento/`: escopo, requisitos de usuário e de sistema, histórias de usuário, plano de testes, matriz de rastreabilidade, decisões arquiteturais, API, banco, segurança e manual do usuário.
- `PASSO_A_PASSO_GITHUB.md`.

### Alterado
- Front-end reescrito em módulos ES e CSS próprio (`estilo.css`) com variáveis de design; `tailwind.js` removido.
- Escopo do projeto reescrito.

### Segurança
- Aviso de privacidade no formulário de contato.

## [1.0.0] — **[PREENCHER data]**
- Versão inicial apresentada ao professor (protótipo da calculadora).
