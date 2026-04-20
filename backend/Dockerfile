FROM node:20-alpine AS node-builder

WORKDIR /backend

COPY package*.json .
RUN npm install

COPY . .
RUN npm run build

# ---- Final stage: Nakama with compiled JS modules ----
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

COPY --from=node-builder /backend/build/*.js /nakama/data/modules/build/
COPY local.yml /nakama/data/
