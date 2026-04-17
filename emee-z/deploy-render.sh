#!/bin/bash

# Deploy EMEE-Z Backend no Render
# Uso: ./deploy-render.sh

echo "🚀 Iniciando deploy do backend no Render..."

# 1. Instala CLI do Render se não tiver
if ! command -v render &> /dev/null; then
  echo "📦 Instalando Render CLI..."
  npm install -g render-deploy-cli
fi

# 2. Faz login (você vai usar seu token do Render)
echo "🔐 Configure seu token do Render em: https://dashboard.render.com/api-keys"
read -p "Cole seu API token: " RENDER_API_KEY
export RENDER_API_KEY

# 3. Deploy
echo "📤 Fazendo deploy..."
render deploy --service emee-z-backend

echo "✅ Deploy concluído!"
echo "Acesse: https://emee-z-backend.onrender.com"
