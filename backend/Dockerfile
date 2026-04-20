FROM node:20-alpine AS node-builder

WORKDIR /backend

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Final stage: Nakama with compiled JS modules ----
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

# Install PostgreSQL client for running init.sql
USER root
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
USER nakama

COPY --from=node-builder /backend/build/*.js /nakama/data/modules/build/
COPY local.yml /nakama/data/
COPY init.sql /nakama/data/init.sql
COPY docker-entrypoint.sh /nakama/docker-entrypoint.sh
# Fix Windows CRLF line endings and make executable
USER root
RUN sed -i 's/\r$//' /nakama/docker-entrypoint.sh && sed -i 's/\r$//' /nakama/data/init.sql && chmod +x /nakama/docker-entrypoint.sh
USER nakama

ENTRYPOINT ["/nakama/docker-entrypoint.sh"]
