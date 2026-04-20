#!/usr/bin/env bash
# =============================================================
# Azure Container Apps — Full-Stack Deployment Script
# Deploys: PostgreSQL + Nakama + Frontend as 3 container apps
# =============================================================
#
# Prerequisites:
#   1. Azure CLI installed and logged in (az login)
#   2. Docker installed locally (to build & push images)
#
# Usage:
#   chmod +x azure-deploy.sh
#   ./azure-deploy.sh
#
# To tear down everything:
#   az group delete --name ttt-rg --yes --no-wait
# =============================================================

set -euo pipefail

# ===================== CONFIGURATION =========================
# Change these values for your deployment
RESOURCE_GROUP="ttt-rg"
LOCATION="eastus"
ACR_NAME="tttacr$(openssl rand -hex 4)"    # Must be globally unique
ENVIRONMENT="ttt-env"

POSTGRES_USER="postgres"
POSTGRES_PASSWORD="$(openssl rand -base64 24)"
POSTGRES_DB="nakama"
NAKAMA_SERVER_KEY="$(openssl rand -hex 16)"
NAKAMA_CONSOLE_USER="admin"
NAKAMA_CONSOLE_PASS="$(openssl rand -base64 16)"
# =============================================================

echo "============================================="
echo " Azure Container Apps — Tic Tac Toe Deploy"
echo "============================================="
echo ""
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo "ACR            : $ACR_NAME"
echo ""

# ---------- 1. Resource Group ----------
echo "[1/8] Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ---------- 2. Azure Container Registry ----------
echo "[2/8] Creating Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_SERVER="$ACR_NAME.azurecr.io"
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "       ACR Server: $ACR_SERVER"

# ---------- 3. Build & Push Images ----------
echo "[3/8] Building and pushing backend image..."
az acr build \
  --registry "$ACR_NAME" \
  --image ttt-backend:latest \
  --file backend/Dockerfile \
  backend/

echo "[4/8] Building and pushing frontend image..."
az acr build \
  --registry "$ACR_NAME" \
  --image ttt-frontend:latest \
  --file frontend/Dockerfile \
  --build-arg VITE_NAKAMA_HOST="" \
  --build-arg VITE_NAKAMA_PORT="" \
  --build-arg VITE_NAKAMA_KEY="$NAKAMA_SERVER_KEY" \
  --build-arg VITE_NAKAMA_SSL="" \
  frontend/

# ---------- 4. Container Apps Environment ----------
echo "[5/8] Creating Container Apps environment..."
az containerapp env create \
  --name "$ENVIRONMENT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ---------- 5. PostgreSQL Container ----------
echo "[6/8] Deploying PostgreSQL..."
az containerapp create \
  --name ttt-postgres \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --image "postgres:16-alpine" \
  --target-port 5432 \
  --exposed-port 5432 \
  --ingress internal \
  --transport tcp \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "POSTGRES_DB=$POSTGRES_DB" \
    "POSTGRES_USER=$POSTGRES_USER" \
    "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  --output none

# Wait for postgres to be ready
echo "       Waiting for PostgreSQL to start..."
sleep 30

POSTGRES_FQDN=$(az containerapp show \
  --name ttt-postgres \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "       PostgreSQL FQDN: $POSTGRES_FQDN"

# ---------- 6. Nakama Container ----------
echo "[7/8] Deploying Nakama backend..."

az containerapp create \
  --name ttt-nakama \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --image "$ACR_SERVER/ttt-backend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 7350 \
  --ingress external \
  --transport http \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    "NAKAMA_SERVER_KEY=$NAKAMA_SERVER_KEY" \
    "NAKAMA_CONSOLE_USERNAME=$NAKAMA_CONSOLE_USER" \
    "NAKAMA_CONSOLE_PASSWORD=$NAKAMA_CONSOLE_PASS" \
    "POSTGRES_USER=$POSTGRES_USER" \
    "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
    "POSTGRES_HOST=$POSTGRES_FQDN" \
    "POSTGRES_PORT=5432" \
    "POSTGRES_DB=$POSTGRES_DB" \
  --output none

NAKAMA_FQDN=$(az containerapp show \
  --name ttt-nakama \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "       Nakama FQDN: $NAKAMA_FQDN"

# ---------- 7. Update Frontend with Nakama URL & Deploy ----------
echo "[8/8] Deploying frontend (with Nakama URL baked in)..."

# Rebuild frontend with the actual Nakama FQDN
az acr build \
  --registry "$ACR_NAME" \
  --image ttt-frontend:latest \
  --file frontend/Dockerfile \
  --build-arg "VITE_NAKAMA_HOST=" \
  --build-arg "VITE_NAKAMA_PORT=" \
  --build-arg "VITE_NAKAMA_KEY=$NAKAMA_SERVER_KEY" \
  --build-arg "VITE_NAKAMA_SSL=" \
  --build-arg "NAKAMA_PROXY_HOST=$NAKAMA_FQDN" \
  frontend/

az containerapp create \
  --name ttt-frontend \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --image "$ACR_SERVER/ttt-frontend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 80 \
  --ingress external \
  --transport http \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --output none

FRONTEND_FQDN=$(az containerapp show \
  --name ttt-frontend \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# ===================== DONE =================================
echo ""
echo "============================================="
echo " DEPLOYMENT COMPLETE"
echo "============================================="
echo ""
echo " Frontend URL : https://$FRONTEND_FQDN"
echo " Nakama API   : https://$NAKAMA_FQDN"
echo ""
echo " Nakama Console: https://$NAKAMA_FQDN/console"
echo "   Username    : $NAKAMA_CONSOLE_USER"
echo "   Password    : $NAKAMA_CONSOLE_PASS"
echo ""
echo " Database"
echo "   Host     : $POSTGRES_FQDN"
echo "   User     : $POSTGRES_USER"
echo "   Password : $POSTGRES_PASSWORD"
echo "   Database : $POSTGRES_DB"
echo ""
echo " Server Key : $NAKAMA_SERVER_KEY"
echo ""
echo " SAVE THESE CREDENTIALS — they won't be shown again."
echo ""
echo " To tear down:"
echo "   az group delete --name $RESOURCE_GROUP --yes --no-wait"
echo "============================================="
