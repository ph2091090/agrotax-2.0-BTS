# 4. Registro de acesso e de dados do site

**Onde fica:** `API/src/registro-acesso/` (modelo, middleware, controlador, rotas), `API/src/utilitarios/csv.js`,
tabela `acessos` em `API/banco/schema.sql` e o painel `front-end/admin.html` + `front-end/js/admin.js`.

## O que é registrado

Uma linha por acesso ao site ou à API (menos arquivos de estilo/script e `/api/saude`):

| Campo | Exemplo | Observação |
|---|---|---|
| `criado_em` | 2026-11-24 14:03:11 | UTC |
| `metodo` / `rota` | `POST /api/calculos`, `GET /api/simulacoes/:id` | números viram `:id` para agrupar |
| `status` / `duracao_ms` | 201 / 12 | permite ver erros e lentidão |
| `ip_hash` | `9f2c1a7b04d83e55` | **o IP não é guardado**: só um hash com "sal" |
| `idioma` | `es` | para saber quem usa cada idioma |
| `navegador` | início do `User-Agent` | até 120 caracteres |

**O que NÃO é registrado:** IP, corpo da requisição (o que o usuário digitou), parâmetros da URL, token de acesso.

## Privacidade (LGPD) — decisões de projeto

- **Minimização:** só se guarda o necessário para estatística e diagnóstico.
- **Pseudonimização:** o hash do IP permite contar visitantes únicos sem saber quem são.
- **Retenção:** registros com mais de 90 dias são apagados ao iniciar o servidor (`DIAS_RETENCAO_REGISTROS` no `.env`).
- **Acesso restrito:** painel e CSVs exigem o `TOKEN_ADMIN` (comparação em tempo constante); sem token configurado, ficam desativados (404).
- **Exportação segura:** CSVs neutralizam "injeção de fórmula" (texto começando com `=`, `+`, `-`, `@` ganha apóstrofo), evitando que um nome malicioso no formulário de contato vire fórmula no Excel.
- O registro **nunca derruba o site**: se a gravação falhar, o erro vai para o console e a requisição segue normalmente.

Observação: o texto acima descreve medidas técnicas do projeto; não é parecer jurídico.

## Como acessar

| O que | Endereço (cabeçalho `Authorization: Bearer <TOKEN_ADMIN>`) |
|---|---|
| Painel visual | `http://localhost:3000/admin.html` (cola o token na tela) |
| Resumo + últimos 50 (JSON) | `GET /api/admin/acessos?dias=7` |
| CSV de acessos | `GET /api/admin/acessos.csv` |
| CSV de simulações | `GET /api/admin/simulacoes.csv` |
| CSV de contatos | `GET /api/admin/leads.csv` |

Exemplo no terminal:

```
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/admin/acessos
curl -H "Authorization: Bearer SEU_TOKEN" -o acessos.csv http://localhost:3000/api/admin/acessos.csv
```

## Como demonstrar (1 minuto)

1. Com `TOKEN_ADMIN` definido, abra o site, troque o idioma e faça duas simulações.
2. Abra `/admin.html`, cole o token: aparecem total de acessos, visitantes únicos, erros, rotas mais usadas e os últimos acessos (com o idioma de cada um).
3. Clique em **Baixar acessos (CSV)** e abra no Excel.
4. Mostre no console do servidor que cada requisição também continua sendo escrita (`id`, método, rota, status, tempo).

## Testes automatizados

`API/testes/registroAcesso.test.js` (9 testes): grava sem IP e sem query string, ignora `/api/saude` e arquivos estáticos, hash estável, resumo, retenção, painel e CSV, neutralização de fórmulas, CSV de simulações.

## Limitações honestas

- No Render gratuito, o disco é temporário: os registros somem a cada deploy (o console do Render guarda o log textual). Para guardar de forma permanente, use disco persistente ou PostgreSQL.
- O limite de requisições continua em memória (uma instância só), como já registrado no README principal.
- O hash com sal padrão do código serve para teste; em produção defina `SAL_REGISTRO` com um valor longo e aleatório.
