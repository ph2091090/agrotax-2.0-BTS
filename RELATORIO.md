# Relatório Técnico — AgroTax 2.0

**Projeto:** AgroTax — Calculadora de estimativa tributária para o agronegócio  
**Versão:** 2.1.0 (changelog) / pacote `agrotax-api` 2.0.0  
**Data do relatório:** 24/11/2026  
**Repositório:** https://github.com/ph2091090/agrotax-2.0-BTS  
**Demo:** https://agrotax.onrender.com  

> ⚠️ Os resultados são **estimativas** e as alíquotas iniciais são **exemplos**. Não substituem a análise de um contador.

---

## 1. Sumário executivo

O AgroTax é um site full-stack que estima a carga tributária de operações no agronegócio (ICMS, IPI, PIS, COFINS, Funrural e SENAR). O usuário escolhe um produto, informa o valor, o regime tributário e o tipo de operação (compra/venda); o sistema aplica regras versionadas por data e devolve o valor de cada tributo, o total, o líquido e a carga tributária percentual.

| Aspecto | Situação |
|---|---|
| Funcionamento local | OK — `http://localhost:3000` |
| Testes automatizados | **31/31 passando** (`npm test`) |
| API em execução | OK — `GET /api/saude` → `status: ok` |
| Front-end servido | OK — `index.html` e `admin.html` (HTTP 200) |
| Segurança | CSP, CORS restrito, rate limit, token admin, honeypot, SQL parametrizado |
| Idiomas | Português (padrão) e espanhol (interface + API) |

---

## 2. O que o site faz

### 2.1 Páginas e seções (`front-end/`)

| Página / seção | Descrição |
|---|---|
| **Início (herói)** | Apresentação, selo, CTA para calculadora e guia |
| **Por que usar** | 3 cards: cálculo simplificado, foco no agronegócio, resultado organizado |
| **Calculadora** | Formulário: produto, valor, regime, operação → resultado com tributos e exportação |
| **Como funciona** | 3 passos da simulação |
| **Guia fiscal** | Cards de ICMS, IPI, PIS, COFINS, Funrural, SENAR (dados da API) |
| **Sobre** | Texto institucional + formulário de contato (leads) |
| **Rodapé** | Ano automático + aviso institucional |
| **admin.html** | Painel de acessos/simulações/leads (exige `TOKEN_ADMIN`) |

### 2.2 Recursos de UI/UX

- Tema claro/escuro (preferência persistida)
- Layout responsivo (mobile e desktop)
- Acessibilidade: `aria-*`, `aria-live` no resultado, navegação por âncoras
- Estados de carregamento, erro e vazio
- Toast de avisos
- **Exportar resultado:** Baixar CSV, Imprimir/PDF, Copiar
- Validação no cliente e no servidor

### 2.3 Tributos estimados

| Tributo | Observação (seed) |
|---|---|
| ICMS | Alíquota de referência (exemplo) |
| IPI | Produto *in natura* costuma ser não tributado |
| PIS | Varia por regime (cumulativo / não cumulativo / DAS / PF) |
| COFINS | Idem PIS |
| Funrural | INSS 1,2% + RAT 0,1% (venda do produtor PF) |
| SENAR | 0,2% sobre receita bruta (venda do produtor PF) |

**Regimes aceitos:** Lucro Presumido, Lucro Real, Simples Nacional, Produtor Rural PF  
**Operações:** Compra, Venda  

---

## 3. Arquitetura

```
Navegador (front-end HTML/CSS/JS módulos ES)
        │  fetch /api/*
        ▼
Express (API/src/app.js)
  middlewares: idioma → registro-acesso → seguranca → CORS → JSON
        │
        ├── rotas → controladores → serviços → modelos → SQLite
        └── utilitarios/calculadoraTributaria.js  (motor puro)
        │
        ▼
SQLite (better-sqlite3) — arquivo único API/dados/agrotax.db
```

**Camadas da API**

| Camada | Pasta | Papel |
|---|---|---|
| Rotas | `API/src/rotas/`, `registro-acesso/rotas.js` | Endpoints HTTP |
| Controladores | `API/src/controladores/` | Valida entrada, monta resposta |
| Serviços | `API/src/servicos/` | Regra de negócio (simular, leads, guia) |
| Modelos | `API/src/modelos/` | Acesso a dados (SQL parametrizado) |
| Motor | `API/src/utilitarios/calculadoraTributaria.js` | Função pura de cálculo |
| Middlewares | `API/src/middlewares/` | Segurança, erros, idioma, rate limit, auth admin |

O mesmo processo Express serve a API e os arquivos estáticos de `front-end/` (uma única URL no deploy).

---

## 4. Banco de dados (SQLite)

### 4.1 Tabelas

| Tabela | Função | Detalhes |
|---|---|---|
| `produtos` | Produtos agrícolas | NCM único, flag `ativo` |
| `regras_tributarias` | Alíquotas | Versionadas por `vigente_desde` / `vigente_ate`; `*` = genérico |
| `simulacoes` | Histórico de cálculos | Valor e total em **centavos**; `resultado_json` |
| `leads` | Contatos do formulário | nome, email, mensagem, criado_em |
| `acessos` | Registro de acesso | Sem IP em claro (só `ip_hash`), método, rota, status, duração, idioma, navegador |

### 4.2 Seed (produtos de exemplo)

1. Soja em grão — NCM 1201.90.00  
2. Milho em grão — NCM 1005.90.10  
3. Café cru em grão — NCM 0901.11.10  
4. Boi gordo — NCM 0102.29.90  
5. Leite in natura — NCM 0401.20.10  

### 4.3 Atualização de alíquotas (sem editar código)

1. Fechar `vigente_ate` da regra antiga  
2. Inserir regra nova com `vigente_desde` na data da mudança  

Integridade: `CHECK`, chave estrangeira, índice em `simulacoes.criado_em` e `acessos.criado_em`, `UNIQUE` na regra.

---

## 5. API REST

| Método | Rota | Descrição | Limite |
|---|---|---|---|
| GET | `/api/saude` | Health check | — |
| GET | `/api/produtos` | Lista produtos ativos | — |
| POST | `/api/calculos` | Simulação tributária | 60/min |
| GET | `/api/calculos/:id` | Busca simulação por id | — |
| GET | `/api/tributos` | Guia fiscal (alíquotas min/max) | — |
| POST | `/api/leads` | Formulário de contato | 5/hora |
| GET | `/api/leads` | Lista leads (admin) | Bearer `TOKEN_ADMIN` |
| GET | `/api/admin/acessos` | Painel de acessos | Bearer `TOKEN_ADMIN` |
| GET | `/api/admin/acessos.csv` | Exporta acessos | Bearer `TOKEN_ADMIN` |
| GET | `/api/admin/simulacoes.csv` | Exporta simulações | Bearer `TOKEN_ADMIN` |
| GET | `/api/admin/leads.csv` | Exporta leads | Bearer `TOKEN_ADMIN` |

### 5.1 Exemplo — simulação

```http
POST /api/calculos
Content-Type: application/json

{ "produtoId": 1, "valor": 100000, "regime": "Lucro Real", "operacao": "Venda" }
```

Resumo do teste local (Soja, R$ 100.000, Lucro Real, Venda):

| Tributo | Alíquota | Valor |
|---|---:|---:|
| ICMS | 12% | R$ 12.000,00 |
| IPI | 0% | R$ 0,00 |
| PIS | 1,65% | R$ 1.650,00 |
| COFINS | 7,6% | R$ 7.600,00 |
| Funrural | — | R$ 0,00 |
| SENAR | — | R$ 0,00 |
| **Total** | **21,25%** | **R$ 21.250,00** |

Outro exemplo (Boi gordo, R$ 50.000, Produtor Rural PF, Venda): carga **13,5%** (ICMS + Funrural + SENAR).

### 5.2 Formato de resposta

```json
{
  "sucesso": true,
  "dados": {
    "id": 1,
    "produto": { "id": 1, "nome": "Soja em grão", "ncm": "1201.90.00" },
    "regimeTributario": "Lucro Real",
    "tipoOperacao": "Venda",
    "valorCentavos": 10000000,
    "tributos": [ { "tributo": "ICMS", "aliquota": 12, "valorCentavos": 1200000, "observacao": "..." } ],
    "totalCentavos": 2125000,
    "liquidoCentavos": 7875000,
    "cargaTributaria": 21.25
  }
}
```

---

## 6. Motor tributário

Arquivo: `API/src/utilitarios/calculadoraTributaria.js`

- **Função pura** (sem banco, sem Express) → fácil de testar  
- Seleção de regra: filtra por tributo, vigência, produto, regime e operação  
- **Especificidade:** produto (+4) > regime (+2) > operação (+1); empate → regra mais recente  
- Cálculo em **centavos inteiros** (evita erro de ponto flutuante)  
- Saída: tributos, total, líquido e carga tributária (%)  

---

## 7. Front-end

| Arquivo | Papel |
|---|---|
| `index.html` | Página única com seções e atributos `data-i18n` |
| `admin.html` | Painel administrativo de acessos |
| `css/estilo.css` | Estilo próprio com variáveis (claro/escuro), responsivo |
| `js/app.js` | Bootstrap dos módulos |
| `js/calculadora.js` | Formulário, chamada à API, render do resultado |
| `js/guia.js` | Carrega `/api/tributos` |
| `js/contato.js` | Envio de leads + honeypot |
| `js/exportar.js` | CSV, impressão/PDF, copiar |
| `js/i18n.js` | Dicionário PT/ES e troca de idioma |
| `js/tema.js` / `tema-inicio.js` | Tema escuro/claro (sem flash ao carregar) |
| `js/utilitarios.js` | `fetch` com tratamento, escape XSS, formatação |
| `js/admin.js` | Painel admin (token, CSV) |

Stack: HTML5 semântico, CSS3 (flex/grid), JavaScript ES6+ **sem framework e sem etapa de build**.

---

## 8. Internacionalização (PT / ES)

- **Interface:** chaves `data-i18n` em `front-end/js/i18n.js` (~416 linhas)  
- **API:** `Accept-Language` → middleware `idioma` → `utilitarios/i18n.js`  
- Traduz: erros, produtos, guia, regimes, operações, observações das regras  
- Moeda e números formatados no padrão do idioma  
- Padrão: português (sem cabeçalho ou idioma não suportado)

---

## 9. Segurança

| Controle | Implementação |
|---|---|
| CSP | `default-src 'self'`, scripts self, fonts Google, `frame-ancestors 'none'` |
| Outros headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; HSTS em produção |
| CORS | Lista de origens via `CORS_ORIGIN` (fechado em produção) |
| SQL injection | Consultas parametrizadas (better-sqlite3) |
| XSS | Escape de saída no front (`esc()`) |
| Rate limit | Em memória por IP (cálculo 60/min; leads 5/h) |
| Admin | `Authorization: Bearer TOKEN_ADMIN`; sem token → rotas desativadas |
| Spam/robô | Campo escondido (honeypot) no formulário |
| Payload | `express.json` limitado a 10kb |
| Privacidade | Registro de acesso **sem IP em claro** (hash com sal); retenção configurável |
| Exportação CSV | BOM, separador `;`, neutralização de injeção de fórmula |

---

## 10. Registro de acesso e admin

- Cada requisição gravada na tabela `acessos` (id da requisição, método, rota, status, duração, hash do IP, idioma, navegador)  
- Painel: `http://localhost:3000/admin.html` (com `TOKEN_ADMIN` em `API/.env`)  
- Exportação CSV: acessos, simulações e leads  
- Retenção: `DIAS_RETENCAO_REGISTROS` (padrão 90 dias)  
- Sal do hash: `SAL_REGISTRO`  

---

## 11. Testes

| Suíte | Arquivo | Foco |
|---|---|---|
| Motor tributário | `calculadoraTributaria.test.js` | Regras, especificidade, centavos |
| Controladores | `controladores.test.js` | HTTP + integração com banco |
| Validações | `validadores.test.js` | Simulação e lead |
| i18n | `i18n.test.js` | PT/ES |
| Registro de acesso | `registroAcesso.test.js` | Banco, CSV, painel |

**Resultado local:** `npm test` → **31 testes, 31 pass, 0 fail** (~250 ms)  
Framework: `node:test` nativo (sem dependência extra)  
Casos manuais: `documento/plano_de_testes.md` (23 casos descritos)

---

## 12. Documentação do projeto (`documento/`)

| Documento | Conteúdo |
|---|---|
| `escopo_do_projeto.md` | Objetivos SMART, EAP, riscos, partes interessadas |
| `requisitos_de_usuario.md` | RU, personas, UC, regras de negócio |
| `historias_de_usuario.md` | HU com Gherkin |
| `requisitos_de_sistema.md` | RSF/RNF, contratos de API, lacunas |
| `plano_de_testes.md` | Testes automatizados e manuais |
| `matriz_de_rastreabilidade.md` | Requisito ↔ código ↔ teste |
| `decisoes_arquiteturais.md` | 11 ADRs |
| `arquitetura.md` | Camadas e fluxo |
| `banco-de-dados.md` | Tabelas e atualização de alíquota |
| `api.md` | Referência dos endpoints |
| `seguranca.md` | Controles e limites |
| `manual_do_usuario.md` | Como usar o site |

Também: `Documentacao_Projeto.md`, `CHANGELOG.md`, `README.md`, `PASSO_A_PASSO_GITHUB.md` e a pasta `qualidade-e-saida-de-informacoes/` (UI/UX, tradução, portabilidade/Docker, registro de acesso).

---

## 13. Portabilidade e execução

### 13.1 Uma linha (script)

```bash
./iniciar.sh          # Linux/macOS
iniciar.bat           # Windows
iniciar.command       # macOS
```

O script valida Node 18+, instala dependências, cria `.env` e sobe o servidor.

### 13.2 Manual

```bash
cd API
npm install
cp .env.example .env   # opcional em dev
npm start              # http://localhost:3000
npm test               # 31 testes
npm run banco          # recriar banco
npm run dev            # com --watch
```

### 13.3 Docker

Em `qualidade-e-saida-de-informacoes/03-portabilidade/`: `Dockerfile` e `docker-compose.yml` (volume para o banco, health check).

### 13.4 Variáveis de ambiente (`API/.env`)

| Variável | Uso |
|---|---|
| `PORT` | Porta (padrão 3000) |
| `NODE_ENV` | `production` → HSTS + CORS fechado |
| `CORS_ORIGIN` | Origens autorizadas |
| `ARQUIVO_BANCO` | Caminho do SQLite |
| `TOKEN_ADMIN` | Senha do `GET /api/leads` e `/api/admin/*` (vazio = desativado) |
| `SAL_REGISTRO` | Sal do hash de IP |
| `DIAS_RETENCAO_REGISTROS` | Retenção dos acessos (padrão 90) |

---

## 14. Deploy (Render)

- **Root Directory:** `API`  
- **Build:** `npm install`  
- **Start:** `npm start`  
- Variáveis: `NODE_ENV=production` e opcional `TOKEN_ADMIN`  
- ⚠️ Plano gratuito: disco **efêmero** → SQLite reinicia a cada deploy  

---

## 15. Métricas do código (aprox.)

| Área | Detalhe |
|---|---|
| API (`src/`) | ~1.190 linhas (config, rotas, controllers, services, models, middlewares, utilitários) |
| Front-end JS | ~890 linhas (módulos ES) |
| CSS | ~222 linhas |
| Testes | 5 arquivos, 31 casos |
| Documentos | 12+ Markdown em `documento/` + guias na raiz |
| Banco | SQLite em arquivo único (~4 KB seed) |

---

## 16. Fluxo completo de uma simulação

1. Usuário abre `index.html` → `js/app.js` inicia tema, i18n, calculadora, guia e contato  
2. Calculadora busca `GET /api/produtos` e monta o `<select>`  
3. Usuário envia produto, valor, regime e operação  
4. Front valida e chama `POST /api/calculos`  
5. Validação no servidor (`validadores.js`)  
6. Serviço carrega produto + regras e chama o motor  
7. Motor escolhe regra vigente e mais específica por tributo  
8. Simulação gravada em `simulacoes`  
9. Resposta JSON (traduzida se `Accept-Language: es`)  
10. Front formata moeda/porcentagem e oferece CSV/imprimir/copiar  

---

## 17. Pontos fortes

- Arquitetura em camadas clara e testável  
- Motor tributário isolado e versionamento de alíquotas por data  
- Segurança prática (headers, limites, token, honeypot, SQL parametrizado)  
- i18n PT/ES na interface e na API  
- Documentação densa (escopo, requisitos, ADRs, testes, rastreabilidade)  
- Portabilidade: script 1 clique, manual e Docker  
- 31 testes automatizados passando  

## 18. Limitações conhecidas

- Alíquotas de exemplo — validar com contador (ICMS real varia por estado, NCM e operação)  
- Sem login de usuário; área restrita só com token  
- Rate limit em memória (vale para 1 instância)  
- SQLite no Render plano gratuito é efêmero  
- Projeto acadêmico/demonstração — não é software de escrituração fiscal  

---

## 19. Como reproduzir a verificação

```bash
cd API
npm install
npm test                 # 31/31
npm start                # localhost:3000
curl localhost:3000/api/saude
curl localhost:3000/api/produtos
curl -X POST localhost:3000/api/calculos \
  -H 'Content-Type: application/json' \
  -d '{"produtoId":1,"valor":100000,"regime":"Lucro Real","operacao":"Venda"}'
```

---

## 20. Estrutura do repositório

```
agrotax-2.0-BTS/
├── API/                    # Back-end Node.js/Express + SQLite
│   ├── banco/              # schema.sql e dados_iniciais.sql
│   ├── src/                # app, server, camadas e middlewares
│   ├── testes/             # 31 testes
│   ├── .env.example
│   └── package.json
├── front-end/              # index.html, admin.html, css/, js/, assets/
├── documento/              # 12 documentos + site de docs
├── qualidade-e-saida-de-informacoes/  # mapa de avaliação + Docker
├── iniciar.bat|.sh|.command
├── CHANGELOG.md
├── Documentacao_Projeto.md
├── PASSO_A_PASSO_GITHUB.md
├── README.md
└── RELATORIO.md            # este relatório
```

---

*Relatório gerado a partir da análise do código-fonte, execução local da API, execução da suíte de testes e verificação dos endpoints.*
