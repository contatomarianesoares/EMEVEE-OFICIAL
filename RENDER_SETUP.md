# Setup Render em 5 passos

## ✅ Passo 1: Colocar projeto no GitHub

Se ainda não fez, faça agora:

1. Abra: https://github.com/new
2. Crie um repositório chamado **EMEVEE-Z**
3. Clone para seu computador:
   ```bash
   git clone https://github.com/SEU_USER/EMEVEE-Z.git
   cd EMEVEE-Z
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

**Resultado:** Seu projeto está no GitHub.

---

## ✅ Passo 2: Conectar GitHub no Render

1. Abra: https://dashboard.render.com
2. Clique em **"New +"** (azul, topo)
3. Escolha **"Web Service"**
4. Clique em **"Connect a repository"**
5. Procure **EMEVEE-Z** e clique
6. Clique em **"Connect"**

**Resultado:** Render conectou ao seu repo.

---

## ✅ Passo 3: Preencher formulário

| Campo | Valor |
|-------|-------|
| Name | `emee-z-backend` |
| Runtime | `Node` |
| Build Command | `cd backend && npm install` |
| Start Command | `cd backend && npm start` |
| Plan | `Free` |

---

## ✅ Passo 4: Adicionar Environment Variables

Clique em **"Add Environment Variable"** e adicione cada uma:

```
DATABASE_URL = postgresql://postgres:99b35f38e5a0b15d7dcac5a12f99d93d@db.dysnlzaqnwpmmbqundqd.supabase.co:5432/postgres

JWT_SECRET = emeez_jwt_secret_super_longa_e_segura_para_producao_2024

EVOLUTION_API_KEY = emeez-evolution-key-2024

NODE_ENV = production
```

---

## ✅ Passo 5: Clicar em Deploy

1. Clique em **"Create Web Service"** (azul, final da página)
2. Espere até ficar **"Live"** (pode demorar 3-5 min)
3. Copie a URL que aparecer (tipo: `https://emee-z-backend.onrender.com`)

---

## 🎯 Depois do Deploy

Quando estiver Live, faça isso na Vercel:

1. Abra: https://vercel.com
2. Clique em **"jurialvo-crm-new"**
3. Vá em **Settings** → **Environment Variables**
4. Adicione:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://emee-z-backend.onrender.com` (a URL que você copiou)
5. Clique em **"Save"**
6. Clique em **"Redeploy"**

---

## 🧪 Testar

Acesse: https://jurialvo-crm-new.vercel.app

Login com:
- **Email**: contatomarianesoares@gmail.com
- **Senha**: Teste123!

