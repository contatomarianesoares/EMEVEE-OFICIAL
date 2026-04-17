# EMEVEE OFICIAL — STATE.md (Handover para próxima IA)

**Última atualização**: 17/04/2026 13:30 — Claude Haiku 4.5 (Continuação)
**Status geral**: 🚀 MIGRAÇÃO VERCEL EM PROGRESSO | ✅ Env Vars Configuradas | ✅ API Routes Reorganizadas | 🧪 Aguardando Build Vercel

---

## 🚀 MIGRAÇÃO CLOUD — 17/04/2026

### Sessão Anterior (Antigravity AI)
1. ✅ **Migração Serverless**: Backend Node.js migrado para Vercel Serverless Functions (pastas `/frontend/api`).
2. ✅ **Real-time Nativo**: Socket.io substituído por **Supabase Realtime** (Hook `useRealtime.js`).
3. ✅ **Banco de Dados**: Migrado para Supabase (Id: `dysnlzaqnwpmmbqundqd`). Coluna `ultimo_qr_code` adicionada.
4. ✅ **Frontend**: Refatorado para usar caminhos relativos `/api` e baseURL hardcoded.

### Sessão Atual (Claude Haiku 4.5 - 13:30h)
**O que foi feito:**
1. ✅ **Environment Variables (Vercel)**: Adicionadas 4 variáveis no dashboard:
   - `DATABASE_URL` = postgresql://postgres:99b35f38e5a0b15d7dcac5a12f99d93d@db.dysnlzaqnwpmmbqundqd.supabase.co:5432/postgres
   - `JWT_SECRET` = 096514ffff6f963ea655fae4b70046b9723eb4a1ae808ee7f182d88c0adc537b
   - `EVOLUTION_API_KEY` = 4d64ae786ecee5d23b97a4168356075032252787e5975b5f
   - `NODE_ENV` = production
   - Status: ✅ Salvas no Vercel, Redeploy executado (dpl_HtM6fJwQSL66SVu3L4s2Mz3R4GZx)

2. ✅ **API Route Fixes**:
   - Corrigido: Convertidas 19 rotas de `export default` para `module.exports` (CommonJS para Vercel)
   - Commit: `42cbdc5` — "fix: convert all API routes from ES6 export default to CommonJS module.exports"

3. ✅ **API Folder Reorganization** (CRITICAL FIX):
   - Movidas rotas de `frontend/api/` para `api/` (raiz do projeto)
   - Motivo: Vercel não reconhecia rotas em subdiretórios - precisa estar na raiz
   - Commit: `3af9ca6` — "refactor: move API routes to root api/ directory for Vercel compatibility"
   - Estrutura corrigida:
     ```
     emee-z/
       ├── api/            ← AGORA AQUI (raiz)
       │   ├── auth/login.js
       │   ├── conversas/
       │   ├── lib/db.js
       │   └── ...
       └── frontend/
           ├── src/
           └── dist/
     ```

4. ✅ **vercel.json Updates**:
   - Configurada routing para reconhecer API functions
   - Commit: `80534ae` — "fix: improve vercel.json routing configuration"

**STATUS ATUAL**: 🧪 Aguardando Vercel redetectar GitHub commits
- Último git commit: `3af9ca6` (API reorganization)
- Vercel build atual: dpl_HtM6fJwQSL66SVu3L4s2Mz3R4GZx (com env vars, mas sem API reorganização ainda)
- Próximo passo: Vercel deve redetectar `3af9ca6` e fazer novo build com API em `/api`
- ⏳ **BLOCKER**: API endpoints ainda retornam 405 (Method Not Allowed) = aguardando novo build

**Tabelas que este projeto escreve/lê no Supabase:**
- `conversas_wpp` — sincronização de conversas com CRM (escrita pelo EMEVEE-Z)
- `notas_wpp` — notas internas das conversas (escrita pelo EMEVEE-Z)
- `negocios` — tabela do CRM (só lida pelo EMEVEE-Z para mostrar dados do negócio vinculado)

> Nota: `negocios`, `notas`, `atividades`, `produtos_negocio`, `perfis` são criados pelo JURIALVO-CRM.
> O EMEVEE-Z não cria essas tabelas, só lê `negocios` e escreve em `conversas_wpp` e `notas_wpp`.

**Schema das tabelas que EMEVEE-Z cria/gerencia:**
```sql
-- Sincronização de conversas WPP ↔ CRM
CREATE TABLE IF NOT EXISTS conversas_wpp (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id        text UNIQUE NOT NULL,
  negocio_id         uuid REFERENCES negocios(id) ON DELETE SET NULL,
  contato_nome       text,
  contato_telefone   text,
  status             text,
  agente_nome        text,
  ultima_mensagem    text,
  ultima_mensagem_em timestamptz,
  criado_em          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversas_wpp ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversas_wpp_all ON conversas_wpp FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notas internas das conversas WhatsApp
CREATE TABLE IF NOT EXISTS notas_wpp (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  text NOT NULL,
  texto        text NOT NULL,
  autor        text,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notas_wpp ENABLE ROW LEVEL SECURITY;
CREATE POLICY notas_wpp_all ON notas_wpp FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 🖥️ SERVIDOR

| Campo | Valor |
|-------|-------|
| IP | `152.67.53.192` |
| Provedor | Oracle Cloud — Always Free (nova conta criada 14/04/2026) |
| OS | Ubuntu 22.04 |
| SSH Key | `~/.ssh/id_rsa_emeez` |
| Diretório | `~/emee-z` |
| Acesso | `ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192` |

---

## 🐳 CONTAINERS (todos rodando e healthy)

```
emee-z-frontend   → porta 80   (nginx, healthy ✅)
emee-z-backend    → porta 3000 (Node.js Fastify, up ✅)
emee-z-evolution  → porta 8080 (Evolution API v2.2.3, up ✅)
emee-z-postgres   → porta 5432 (PostgreSQL 15, healthy ✅)
emee-z-redis      → porta 6379 (Redis 7, up ✅)
```

Comandos úteis no servidor:
```bash
cd ~/emee-z
docker ps                          # ver status
docker compose logs -f backend     # logs backend
docker compose restart backend     # restart sem rebuild
docker compose up -d               # subir tudo
```

---

## 🔐 CREDENCIAIS

### Vercel (Hospedagem atual)
- **URL**: [https://jurialvo-crm-new.vercel.app](https://jurialvo-crm-new.vercel.app)
- **Root Directory**: `emee-z/frontend`

### Supabase (Banco de Dados Principal)
- **Projeto**: `EMEVEE-Z` (dysnlzaqnwpmmbqundqd)
- **DATABASE_URL**: (Ver Vercel Settings)

### JWT
- **JWT_SECRET**: `096514ffff6f963ea655fae4b70046b9723eb4a1ae808ee7f182d88c0adc537b`

---

## 📁 ESTRUTURA DO PROJETO (local Mac)

```
/Users/marianesoares/Desktop/EMEVEE-Z/
├── STATE.md                    ← este arquivo
├── emee-z_plano_execucao.md    ← spec original do projeto
├── design-output/              ← poster UI design (PNG 1920x1080) gerado por IA
│   ├── emee-z-poster.png       ← produto showcase (Login + Inbox + Dashboard)
│   ├── philosophy.md           ← filosofia de design "Meridian Void"
│   └── render_inbox_poster.py  ← script Python que gerou o poster
└── emee-z/
    ├── docker-compose.yml      ← usa Dockerfile.prebuilt para frontend
    ├── .env                    ← NÃO commitar (segredos)
    ├── backend/
    │   ├── Dockerfile
    │   ├── package.json        ← inclui jsonwebtoken
    │   └── src/
    │       ├── index.js
    │       ├── middleware/
    │       │   ├── auth.js         ← autenticarGestora composta (CORRIGIDO)
    │       │   └── permissoes.js   ← async sem done callback (CORRIGIDO)
    │       ├── routes/
    │       │   ├── auth.js
    │       │   ├── instancias.js   ← QR Code flow com aguardando:true (CORRIGIDO)
    │       │   ├── webhooks.js     ← handler qrcode.updated (CORRIGIDO)
    │       │   ├── conversas.js
    │       │   ├── mensagens.js
    │       │   ├── agentes.js
    │       │   ├── leads.js
    │       │   ├── bot.js
    │       │   └── relatorios.js
    │       ├── services/
    │       │   ├── evolutionService.js  ← qrCache + polling 8s (CORRIGIDO)
    │       │   └── socketService.js
    │       └── database/
    │           ├── connection.js
    │           └── migrations/
    │               └── 001_schema_inicial.sql  ← UNIQUE index mensagens
    └── frontend/
        ├── Dockerfile              ← NÃO usar no servidor (mata CPU com npm build)
        ├── Dockerfile.prebuilt     ← USAR ESTE no servidor (só nginx + copy dist)
        ├── nginx.conf              ← healthcheck usa 127.0.0.1 (CORRIGIDO)
        ├── .env.local              ← ⚠️ URGENTE: trocar para novo projeto Supabase
        ├── package.json
        └── src/
            ├── lib/
            │   └── supabase.js     ← ✅ NOVO — cliente Supabase + helpers CRM
            ├── components/
            │   ├── InfoContato.jsx ← ✅ REESCRITO — integrado com Supabase (busca negócio pelo telefone)
            │   ├── NotasInternas.jsx← ✅ REESCRITO — salva notas na tabela notas_wpp (Supabase)
            │   ├── JanelaChat.jsx  ← ✅ tema light aplicado
            │   ├── ListaConversas.jsx ← ✅ tema light aplicado
            │   ├── MetricCard.jsx  ← ✅ tema light aplicado
            │   ├── StatusAgente.jsx← ✅ tema light aplicado
            │   ├── KanbanBoard.jsx ← ✅ tema light aplicado
            │   └── TransferirModal.jsx ← ✅ tema light aplicado
            └── pages/
                ├── Login.jsx       ← ✅ tema light aplicado
                ├── GestoraDashboard.jsx ← ✅ tema light aplicado
                ├── Inbox.jsx
                ├── CRM.jsx         ← ✅ limite=100 (CORRIGIDO, era 200)
                ├── Configuracoes.jsx ← ✅ QR Code via Socket.io (CORRIGIDO) + tema light
                └── Relatorios.jsx  ← ✅ tema light aplicado
```

---

## 🎨 TEMA VISUAL (frontend)

O tema foi migrado de **dark** (navy profundo) para **light** em 16/04/2026.

**Cores light aplicadas:**
| De (dark) | Para (light) | Uso |
|-----------|-------------|-----|
| `text-white` | `text-[#111827]` | texto principal |
| `bg-[#1E2A42]` | `bg-[#F0F0F0]` | fundos de input, divisores |
| `stroke="#1E2A42"` | `stroke="#F0F0F0"` | bordas SVG |
| `placeholder-[#3A4B6B]` | `placeholder-[#9CA3AF]` | placeholders |
| `bg-[#0A0E1A]` (navy deep) | `bg-white` ou `bg-[#F8F9FB]` | fundos de card e página |

> ⚠️ A usuária disse que o poster ficou bom mas quer o frontend mais claro. Essa é uma tarefa pendente (ver abaixo).

---

## 🔌 INTEGRAÇÃO EMEVEE-Z ↔ JURIALVO-CRM (via Supabase)

### O que já funciona (código pronto, depende do banco correto)

**`src/lib/supabase.js`** — helpers de integração:
- `vincularConversaNegocio(conversaId, negocioId)` — vincula conversa a negócio
- `sincronizarConversa(conversa)` — upsert em `conversas_wpp`
- `buscarNegocioPorTelefone(telefone)` — busca negócio pelo número
- `criarNegocioDeConversa(conversa)` — cria negócio no CRM a partir de conversa

**`InfoContato.jsx`** — painel direito da tela de inbox:
- Busca negócio CRM vinculado ao telefone do contato
- Mostra estágio, valor, probabilidade, temperatura
- Botão "+ Criar no CRM" que cria negócio e vincula

**`NotasInternas.jsx`** — aba de notas na conversa:
- Carrega e salva notas na tabela `notas_wpp` do Supabase
- Substitui chamada ao backend (que não tinha essa rota)

---

## 🚀 PROCESSO DE DEPLOY (Vercel)

O projeto agora é hospedado inteiramente na Vercel (Frontend e Serverless Backend).

1. **Alterações locais**: `git add .` -> `git commit` -> `git push origin main`.
2. **Deploy**: Automático pela Vercel ao detectar push no branch `main`.
3. **Logs**: Acompanhar via Vercel Dashboard em *Logs* > *Serverless Functions*.

---

## 📡 FLUXO QR CODE (como funciona)

```
1. Usuário clica "Ver QR Code"
2. Frontend → GET /api/instancias/:id/qrcode
3. Serverless API → Evolution: GET /instance/connect/:name
4. Evolution → retorna status ou dispara Webhook
5. Evolution → Webhook POST /api/webhooks/evolution (QRCODE_UPDATED)
6. Webhook → Salva no Supabase (coluna ultimo_qr_code)
7. Frontend → Escuta mudança via Supabase Realtime (Hook useRealtime)
8. Frontend → Exibe QR Code na modal
```

---

## 📋 ROTAS DA API BACKEND

```
POST /auth/login              → login JWT (8h)
POST /auth/logout

GET  /instancias              ✅
POST /instancias              ✅
GET  /instancias/:id/qrcode   ✅ (retorna aguardando:true)
DELETE /instancias/:id

GET  /conversas               ✅
GET  /conversas/:id
PATCH /conversas/:id

GET  /mensagens/:conversa_id  ✅
POST /mensagens

GET  /agentes                 ✅
POST /agentes
PATCH /agentes/:id
DELETE /agentes/:id

GET  /leads                   ✅ (máx 100)
POST /leads
PATCH /leads/:id
DELETE /leads/:id

GET  /relatorios/resumo       ✅
GET  /relatorios/agentes      ✅
GET  /relatorios/funil        ✅
GET  /relatorios/conversoes   ✅

POST /webhooks/evolution      ← recebe QRCODE, mensagens, connection updates
```

---

## 🔧 BUGS CORRIGIDOS (histórico)

1. ✅ Fastify v4 — arrays em preHandler → função composta `autenticarGestora`
2. ✅ `done is not a function` → hooks convertidos para async
3. ✅ QR Code Evolution v2.2.3 → webhook-based (não mais GET /connect)
4. ✅ CRM `limite=200` → validação 400 → corrigido para 100
5. ✅ Evolution webhook payload 400 → `{webhook:{url,events}}`
6. ✅ `jsonwebtoken` não instalado → `npm install jsonwebtoken` no servidor
7. ✅ Nginx healthcheck `localhost` vs `127.0.0.1` → corrigido para `127.0.0.1`
8. ✅ Hash bcrypt incorreto → atualizado (`admin123`)
9. ✅ UNIQUE index em `evolution_message_id` faltando → adicionado
10. ✅ Docker build mata CPU → criado `Dockerfile.prebuilt`

---

## 📌 PENDÊNCIAS / PRÓXIMOS PASSOS

### 🔴 URGENTE — Build Vercel Pendente
- [ ] **MONITORAR**: Vercel precisa redetectar commits `42cbdc5` e `3af9ca6` no GitHub
- [ ] **IF TIMEOUT**: Manualmente fazer "Redeploy" via Vercel dashboard com novo commit
- [ ] **EXPECTATIVA**: Novo build (~2-3 min) deve reconhecer `/api` na raiz e registrar functions
- [ ] **TESTE**: `curl -X POST https://jurialvo-crm-new.vercel.app/api/auth/login` deve retornar JSON (não 405)

### URGENTE — Login Test
- [ ] Após novo build Vercel: testar login com `{"email":"admin@emevee.com","senha":"admin123"}`
- [ ] Esperado: JWT token retornado (status 200) ou erro de credencial (401)
- [ ] Se DB connection falhar: verificar DATABASE_URL na Vercel env vars

### Funcionalidade  
- [ ] Testar fluxo completo WhatsApp via Serverless (QR → mensagem → bot → agente).

### Interface (usuária pediu)
- [ ] Deixar o frontend mais claro (tema atual está light, mas usuária quer ainda mais claro/limpo)
- [ ] Poster design: versão mais clara do poster emee-z-poster.png (está em `design-output/`)

### Funcionalidade
- [ ] Testar fluxo completo WhatsApp: criar instância → QR → receber mensagem → bot → agente
- [ ] Cadastrar agentes reais na plataforma
- [ ] Configurar bot de atendimento

### Infraestrutura
- [ ] Corrigir Evolution `SERVER_URL=http://localhost:8080` → `http://152.67.53.192:8080`
- [ ] HTTPS/SSL com certbot + Let's Encrypt
- [ ] Domínio próprio apontar para 152.67.53.192
- [ ] Fechar porta 8080 no firewall externo
- [ ] Backup automático PostgreSQL

---

## ⚠️ ARMADILHAS CONHECIDAS

1. **NUNCA** `docker compose up --build frontend` no servidor → CPU 100% → SSH cai
2. **NUNCA** reescrever `auth.js`/`permissoes.js` sem verificar fixes Fastify v4
3. **QR Code ciclando 60s = NORMAL** — WhatsApp por design, não bug
4. **Evolution API v2.2.3**: QR via webhook, não GET /connect
5. **`localhost` ≠ `127.0.0.1`** no Alpine Linux para healthcheck nginx
6. **Supabase aqui é INTEGRAÇÃO, não Auth** — o sistema de login usa JWT próprio do backend

---

## 🔗 PROJETOS RELACIONADOS

| Projeto | Caminho | Observação |
|---------|---------|------------|
| JURIALVO-CRM | `/Users/marianesoares/Desktop/JURIALVO-CRM/` | CRM — deve usar mesmo Supabase |
| BACKUP JURIALVO | `/Users/marianesoares/Desktop/BACKUP JURIALVO/` | **PRODUÇÃO com clientes reais — NÃO TOCAR** |
| sentinel-dashboard | `BACKUP JURIALVO/sentinel-dashboard/` | Sistema principal JuriAlvo em produção |
