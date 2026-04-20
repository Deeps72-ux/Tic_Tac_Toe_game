# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* bun.lockb* ./
RUN npm install

COPY . .

# Build arg to set the Nakama URL at build time
ARG VITE_NAKAMA_HOST=nakama
ARG VITE_NAKAMA_PORT=7350
ARG VITE_NAKAMA_KEY=tictactoe_server_key
ARG VITE_NAKAMA_SSL=false

ENV VITE_NAKAMA_HOST=$VITE_NAKAMA_HOST
ENV VITE_NAKAMA_PORT=$VITE_NAKAMA_PORT
ENV VITE_NAKAMA_KEY=$VITE_NAKAMA_KEY
ENV VITE_NAKAMA_SSL=$VITE_NAKAMA_SSL

RUN npm run build

# Production stage — serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configure reverse proxy to Nakama backend (production only)
ARG NAKAMA_PROXY_HOST
RUN if [ -n "$NAKAMA_PROXY_HOST" ]; then \
      sed -i "s|__NAKAMA_BACKEND__|${NAKAMA_PROXY_HOST}|g" /etc/nginx/conf.d/default.conf; \
    else \
      sed -i '/# BEGIN_PROXY/,/# END_PROXY/d' /etc/nginx/conf.d/default.conf; \
    fi

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
