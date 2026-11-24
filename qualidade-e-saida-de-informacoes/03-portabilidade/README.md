# 3. Portabilidade

Portabilidade = o sistema rodar em outros ambientes (outro computador, outro sistema operacional, servidor)
sem reescrever nada. O AgroTax tem **três caminhos**, do mais simples ao mais profissional.

| Caminho | Quando usar | Comando |
|---|---|---|
| **1. Um clique** | Avaliação, computador comum | Windows: duplo clique em `iniciar.bat` · macOS: `iniciar.command` · Linux: `./iniciar.sh` |
| **2. Manual** | Desenvolvimento | `cd API && npm install && npm start` (Node.js 18 ou superior) |
| **3. Docker** | Servidor, ou qualquer máquina com Docker (nada de Node para instalar) | `docker compose -f qualidade-e-saida-de-informacoes/03-portabilidade/docker-compose.yml up --build` |

Depois de subir, o site e a API ficam juntos em **http://localhost:3000**.

## Por que o projeto é portátil

- **Sem dependência de sistema operacional:** caminhos montados com `path` do Node; scripts de início para Windows, macOS e Linux.
- **Configuração fora do código:** tudo pelo `.env` (`API/.env.example`): porta, banco, CORS, token, retenção dos registros. No Docker as mesmas variáveis entram pelo `docker-compose.yml`.
- **Banco em um único arquivo (SQLite):** nada de servidor de banco para instalar; criado e populado sozinho na primeira execução. No Docker fica num **volume** (`/dados`), então atualizar a imagem não apaga os dados.
- **Um servidor só:** a API também entrega o site, então só há uma URL para publicar (é assim que roda no Render).
- **Endereço da API relativo** (`/api`): o front-end funciona em qualquer domínio sem alteração.
- **Verificação de saúde:** `GET /api/saude`, usada pelo Docker (`HEALTHCHECK`) e pelo Render.
- **Dados saem do sistema:** CSV de acessos, simulações e contatos (ver item 4) e CSV/impressão do resultado (item 1).

## O que tem nesta pasta

| Arquivo | Para quê |
|---|---|
| `Dockerfile` | Receita da imagem (Node 20, só dependências de produção, usuário sem privilégios, health check) |
| `docker-compose.yml` | Sobe o contêiner com porta 3000, volume do banco e variáveis opcionais |
| `../../.dockerignore` | Impede que `.env`, banco local, `node_modules` e o `.odt` pesado entrem na imagem |

Para ativar o painel de acessos no Docker (Linux/macOS): `TOKEN_ADMIN=uma-senha-longa docker compose -f ... up --build`. No PowerShell: `$env:TOKEN_ADMIN="uma-senha-longa"` antes do comando.

## Limitações honestas

- O Docker foi escrito seguindo o padrão da ferramenta, mas **não foi executado no ambiente em que o projeto foi preparado**: rode uma vez antes da apresentação. Se `docker compose` não estiver instalado, mostre os caminhos 1 e 2.
- Não há `package-lock.json` no repositório; por isso o Dockerfile usa `npm install`. Depois de rodar `npm install` no seu computador, **envie o `package-lock.json` para o GitHub** e troque por `npm ci` para builds idênticos.
- No plano gratuito do Render o disco é temporário: o SQLite volta ao estado inicial a cada deploy (já descrito no README principal).
