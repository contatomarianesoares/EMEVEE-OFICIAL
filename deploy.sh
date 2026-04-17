#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Script de deploy Emee-z — Oracle Free Tier (1 OCPU)
# Uso: ./deploy.sh
# Faz: build local → rsync → restart no servidor (sem Vite no server)
# ─────────────────────────────────────────────────────────────

set -e
SERVER="ubuntu@152.67.53.192"
KEY="$HOME/.ssh/id_rsa_emeez"
REMOTE_DIR="~/emee-z"
LOCAL_DIR="/Users/marianesoares/Desktop/EMEVEE-Z/emee-z"

echo "════════════════════════════════════════"
echo " Emee-z Deploy — $(date '+%d/%m/%Y %H:%M')"
echo "════════════════════════════════════════"

# 1. Build frontend local (rápido, ~3s no Mac)
echo ""
echo "▶ [1/4] Build do frontend localmente..."
cd "$LOCAL_DIR/frontend"
npm run build
echo "   ✓ Build concluído"

# 2. Sincroniza código backend
echo ""
echo "▶ [2/4] Sincronizando backend..."
rsync -avz --exclude node_modules --exclude .git \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/backend/" "$SERVER:$REMOTE_DIR/backend/"
echo "   ✓ Backend sincronizado"

# 3. Sincroniza frontend (dist pré-compilado + configs)
echo ""
echo "▶ [3/4] Sincronizando frontend..."
rsync -avz \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/frontend/dist/" "$SERVER:$REMOTE_DIR/frontend/dist/"
rsync -avz \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/frontend/nginx.conf" \
  "$LOCAL_DIR/frontend/Dockerfile.prebuilt" \
  "$LOCAL_DIR/docker-compose.yml" \
  "$SERVER:$REMOTE_DIR/frontend/"
rsync -avz \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/docker-compose.yml" \
  "$SERVER:$REMOTE_DIR/"
echo "   ✓ Frontend sincronizado"

# 4. Restart no servidor (sem rebuild do Vite!)
echo ""
echo "▶ [4/4] Reiniciando containers no servidor..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" "
  cd $REMOTE_DIR

  # Rebuild apenas o frontend (só nginx + copy, ~5s)
  docker compose build frontend

  # Restart backend (sem rebuild, já tem imagem)
  docker compose restart backend

  # Recria frontend com nova imagem
  docker compose up -d frontend

  echo ''
  docker ps --format 'table {{.Names}}\t{{.Status}}'
"

echo ""
echo "════════════════════════════════════════"
echo " ✅ Deploy concluído!"
echo " 🌐 http://152.67.53.192"
echo "════════════════════════════════════════"
