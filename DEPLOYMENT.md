# Deploy EMEE-Z na Cloud

## ✅ Concluído

- **Banco de dados**: Supabase (EMEVEE-Z) — schema criado
- **Frontend**: Vercel — já está online em `jurialvo-crm-new.vercel.app`
- **Variáveis de env**: Configuradas na Vercel

## 🚀 Próximo passo: Backend no Render

### 1. Criar conta no Render
- Acesse: https://render.com
- Faça login com GitHub (mais fácil)

### 2. Criar novo Web Service
- Dashboard → New → Web Service
- Conecte seu repo GitHub (EMEVEE-Z)
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

### 3. Adicionar Environment Variables
Copie e cole estas variáveis no painel do Render:

```
DATABASE_URL=postgresql://postgres:99b35f38e5a0b15d7dcac5a12f99d93d@db.dysnlzaqnwpmmbqundqd.supabase.co:5432/postgres
JWT_SECRET=emeez_jwt_secret_super_longa_e_segura_para_producao_2024
EVOLUTION_API_KEY=emeez-evolution-key-2024
NODE_ENV=production
```

### 4. Deploy
- Clique em "Create Web Service"
- Render fará deploy automático

### 5. Atualizar Frontend
Depois que o Render der uma URL (tipo `https://emee-z-backend.onrender.com`):
- Atualize a Vercel com a nova URL do backend
- Ou edite `.env.production` e faça push

## URLs Finais

- **Frontend**: https://jurialvo-crm-new.vercel.app
- **Backend**: https://emee-z-backend.onrender.com (será criada no passo 4)
- **Banco**: dysnlzaqnwpmmbqundqd.supabase.co

## ⚠️ Notas

- Redis foi removido (não é gratuito no Render)
- Evolution API ainda precisa de setup manual (é um serviço externo)
- Primeira requisição será lenta (cold start do Render)
