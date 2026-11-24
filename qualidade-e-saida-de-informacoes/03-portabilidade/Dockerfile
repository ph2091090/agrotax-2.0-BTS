# AgroTax em contêiner: roda igual em Windows, macOS, Linux, Render ou qualquer servidor com Docker.
# Contexto de build = raiz do projeto (veja docker-compose.yml). Imagem final com Node 20 e usuário sem privilégios.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    ARQUIVO_BANCO=/dados/agrotax.db

# A API busca o site em ../front-end, por isso a mesma estrutura de pastas é mantida em /app.
WORKDIR /app/API
COPY API/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY API/ ./
COPY front-end/ /app/front-end/

# O banco SQLite fica num volume: sobrevive a atualizações do contêiner.
RUN mkdir -p /dados && chown -R node:node /dados /app
VOLUME /dados
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
