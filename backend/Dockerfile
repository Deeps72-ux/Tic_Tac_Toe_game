FROM node:20-alpine AS node-builder

WORKDIR /backend

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Final stage: Nakama with compiled JS modules ----
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

COPY --from=node-builder /backend/build/*.js /nakama/data/modules/build/
COPY local.yml /nakama/data/
COPY docker-entrypoint.sh /nakama/docker-entrypoint.sh
# Fix Windows CRLF line endings and make executable
RUN sed -i 's/\r$//' /nakama/docker-entrypoint.sh && chmod +x /nakama/docker-entrypoint.sh

ENTRYPOINT ["/nakama/docker-entrypoint.sh"]
