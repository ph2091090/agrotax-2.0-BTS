# API

Base: `/api` · Formato: JSON · Sucesso `{ "sucesso": true, "dados": ... }` · Erro `{ "sucesso": false, "erro": "mensagem" }`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/saude` | público | Verifica se o servidor está no ar |
| GET | `/api/produtos` | público | Lista produtos ativos |
| GET | `/api/tributos` | público | Guia fiscal: descrição e faixa de alíquotas vigentes |
| POST | `/api/calculos` | público · 60/min por IP | Faz e salva uma simulação |
| GET | `/api/calculos/:id` | público | Consulta uma simulação salva |
| POST | `/api/leads` | público · 5/hora por IP | Envia mensagem de contato |
| GET | `/api/leads` | **token admin** | Lista os leads |

## POST /api/calculos

Requisição:
```json
{ "produtoId": 1, "valor": 100000, "regime": "Produtor Rural PF", "operacao": "Venda" }
```
- `regime`: `Lucro Presumido`, `Lucro Real`, `Simples Nacional`, `Produtor Rural PF`
- `operacao`: `Compra` ou `Venda`
- `valor`: número entre 0,01 e 1.000.000.000.000 (em reais)

Resposta `201`:
```json
{
  "sucesso": true,
  "dados": {
    "id": 1,
    "produto": { "id": 1, "nome": "Soja em grão", "ncm": "1201.90.00" },
    "regimeTributario": "Produtor Rural PF",
    "tipoOperacao": "Venda",
    "valorCentavos": 10000000,
    "tributos": [
      { "tributo": "ICMS", "aliquota": 12, "valorCentavos": 1200000, "observacao": "Alíquota de referência (exemplo)" },
      { "tributo": "FUNRURAL", "aliquota": 1.3, "valorCentavos": 130000, "observacao": "INSS 1,2% + RAT 0,1% sobre a receita bruta" }
    ],
    "totalCentavos": 1350000,
    "liquidoCentavos": 8650000,
    "cargaTributaria": 13.5
  }
}
```
(a lista real traz os 6 tributos; acima foi encurtada)

## POST /api/leads

```json
{ "nome": "Maria", "email": "maria@exemplo.com", "mensagem": "Quero saber mais." }
```
Nome 2–100 caracteres, e-mail válido, mensagem 5–1000 caracteres.

## GET /api/leads

Cabeçalho: `Authorization: Bearer <TOKEN_ADMIN>`

## Área administrativa (registro de acesso e exportação)

Todas exigem `Authorization: Bearer <TOKEN_ADMIN>`. Sem `TOKEN_ADMIN` no `.env`, respondem 404.

| Rota | O que devolve |
|---|---|
| `GET /api/admin/acessos?dias=7` | JSON com `resumo` (total, visitantes únicos, erros, tempo médio, rotas e idiomas mais usados, acessos por dia; `dias` de 1 a 365) e `ultimos` (50 registros) |
| `GET /api/admin/acessos.csv` | CSV de todos os acessos |
| `GET /api/admin/simulacoes.csv` | CSV das simulações com o nome do produto |
| `GET /api/admin/leads.csv` | CSV dos contatos recebidos |

Detalhes e decisões de privacidade: `qualidade-e-saida-de-informacoes/04-registro-de-acesso/README.md`.

## Códigos de erro

| Código | Quando |
|---|---|
| 400 | Dados inválidos ou JSON malformado |
| 401 | Token ausente/errado em rota protegida |
| 404 | Produto/simulação inexistente, rota inexistente, ou área admin desativada |
| 413 | Corpo da requisição maior que 10 KB |
| 429 | Limite de requisições excedido (cabeçalho `Retry-After`) |
| 500 | Erro interno (detalhe só no log do servidor) |
