# EMEE-Z — STATE.md (Handover para próxima IA)

**Última atualização**: 16/04/2026 — Claude Sonnet 4.6
**Status geral**: ✅ SISTEMA FUNCIONANDO EM PRODUÇÃO | ⚠️ SUPABASE APONTANDO PARA BANCO ERRADO (ver seção crítica)

---

## 🚨 PROBLEMA CRÍTICO — LEIA PRIMEIRO

O arquivo `emee-z/frontend/.env.local` aponta para o projeto Supabase `locdev` (`uvvmooztkolmkckmwjwz`), que é o **banco de produção do JuriAlvo** (outro sistema da mesma dona, com clientes reais). Isso é ERRADO.

**O que precisa ser feito:**
1. Criar novo projeto Supabase chamado `jurialvo-suite` — compartilhado com JURIALVO-CRM
2. Aplicar as migrations das tabelas de integração no novo projeto (ver seção banco abaixo)
3. Atualizar `emee-z/frontend/.env.local` com URL e anon key do novo projeto
4. Fazer novo build local e deploy no servidor Oracle (ver seção deploy)

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

### Aplicação (login no frontend — sistema de auth do PRÓPRIO backend, NÃO é Supabase Auth)
- **URL**: http://152.67.53.192
- **Email**: contatomarianesoares@gmail.com
- **Senha**: admin123
- **Papel**: gestora

> ⚠️ Importante: o EMEVEE-Z usa autenticação JWT própria (backend Node.js), NÃO usa Supabase Auth.
> O Supabase aqui é usado APENAS para integração de dados com o JURIALVO-CRM.
> São sistemas de autenticação completamente separados.

### PostgreSQL (banco interno do EMEVEE-Z, no Docker do servidor Oracle)
- **POSTGRES_USER**: emeez
- **POSTGRES_PASSWORD**: 99b35f38e5a0b15d7dcac5a12f99d93d
- **POSTGRES_DB**: emeez_db

### Evolution API
- **URL interna**: http://evolution:8080 (dentro do Docker)
- **URL externa**: http://152.67.53.192:8080
- **EVOLUTION_API_KEY**: ver `~/emee-z/.env` no servidor

### JWT
- **JWT_SECRET**: ver `~/emee-z/.env` no servidor

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

## 🚀 PROCESSO DE DEPLOY (OBRIGATÓRIO — Oracle Free Tier)

⚠️ **NUNCA rodar `npm run build` dentro do Docker no servidor** — 1 OCPU satura, SSH cai, backend morre.

### Deploy do Frontend (quando mudar código React):
```bash
# 1. Build local no Mac (2-3 segundos)
cd /Users/marianesoares/Desktop/EMEVEE-Z/emee-z/frontend
npm run build

# 2. Sync do dist pré-compilado para o servidor
rsync -avz dist/ ubuntu@152.67.53.192:~/emee-z/frontend/dist/ -e "ssh -i ~/.ssh/id_rsa_emeez"
rsync -avz Dockerfile.prebuilt nginx.conf ubuntu@152.67.53.192:~/emee-z/frontend/ -e "ssh -i ~/.ssh/id_rsa_emeez"

# 3. Rebuild no servidor (apenas nginx + copy, ~10 segundos, não mata CPU)
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 \
  'cd ~/emee-z && docker compose build frontend && docker compose up -d frontend'
```

### Deploy do Backend (quando mudar código Node.js):
```bash
rsync -avz --exclude='node_modules' --exclude='.env' \
  /Users/marianesoares/Desktop/EMEVEE-Z/emee-z/backend/src/ \
  ubuntu@152.67.53.192:~/emee-z/backend/src/ \
  -e "ssh -i ~/.ssh/id_rsa_emeez"

ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 \
  'cd ~/emee-z && docker compose build backend && docker compose up -d backend'
```

### Se o servidor travar:
1. Checar: `curl http://152.67.53.192/`
2. Se responder = nginx vivo, SSH caiu por carga → aguardar ou rebootar
3. Reboot: Oracle Cloud → Compute → Instances → emee-z → Reboot
4. Após reboot, containers sobem automaticamente (`restart: always`)

---

## 📡 FLUXO QR CODE (como funciona)

```
1. Usuário clica "Ver QR Code"
2. Frontend → GET /api/instancias/:id/qrcode
3. Backend → Evolution API: GET /instance/connect/:name (dispara reconexão)
4. Backend retorna: { qrcode: null, aguardando: true }
5. Frontend abre modal com spinner
6. Evolution → webhook POST /webhooks/evolution (event: QRCODE_UPDATED)
7. Backend → salva QR no qrCache (TTL 60s) → emite Socket.io 'qrcode_atualizado'
8. Frontend recebe Socket.io → exibe QR na modal
9. QR expira a cada ~60s → Evolution envia novo → frontend atualiza (NORMAL)
10. Usuário escaneia → Evolution envia CONNECTION_UPDATE state=open
11. Backend → status='conectado' → Socket.io 'instancia_status' → modal fecha
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

### URGENTE — Supabase
- [ ] Criar novo projeto `jurialvo-suite` e migrar tabelas (coordenar com JURIALVO-CRM)
- [ ] Atualizar `emee-z/frontend/.env.local` com novo Supabase
- [ ] Build + deploy novo frontend no servidor Oracle

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
