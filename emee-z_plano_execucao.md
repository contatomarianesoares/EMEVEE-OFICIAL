# EMEE-Z — Plano de Execução Completo
### Prompt Master para Vibe Coding (Claude Code)

---

## CONTEXTO DO PROJETO

Você vai construir o **Emee-z**, uma plataforma de gestão de WhatsApp com inbox compartilhado, bot de atendimento, CRM embutido e painel de gestão. O sistema permite que múltiplos agentes atendam pelo mesmo número de WhatsApp, com visibilidade total para a gestora.

Este é um projeto real que será usado internamente pela empresa JuriAlvo (plataforma de inteligência geolocalizada para recuperação de crédito no Brasil) e futuramente vendido como produto SaaS para outras empresas.

---

## STACK TECNOLÓGICA

| Camada | Tecnologia | Versão |
|---|---|---|
| WhatsApp | Evolution API v2 | latest |
| Backend | Node.js + Fastify | Node 20 LTS |
| Tempo real | Socket.io | latest |
| Banco de dados | PostgreSQL | 15 |
| Fila/Cache | Redis + BullMQ | latest |
| Frontend | React + Vite + Tailwind CSS | React 18 |
| Infra | Docker + Docker Compose | latest |
| Servidor alvo | Oracle Cloud Free Tier (Ubuntu 22.04) | — |

---

## ARQUITETURA GERAL

```
[WhatsApp]
    ↓ (QR Code — sem celular físico)
[Evolution API — container Docker]
    ↓ (webhook HTTP)
[Backend Node.js — Fastify]
    ├── PostgreSQL (dados permanentes)
    ├── Redis (sessões, filas, tempo real)
    ├── BullMQ (fila de mensagens)
    └── Socket.io (push para frontend)
         ↓
[Frontend React]
    ├── Painel da Agente (inbox pessoal)
    ├── Painel da Gestora (visão total)
    ├── CRM (kanban + lead)
    └── Configurações (bot, agentes, instâncias)
```

---

## MODELO DE DADOS — BANCO POSTGRESQL

### Tabela: usuarios
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('gestora', 'agente')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: instancias
```sql
CREATE TABLE instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  numero_whatsapp VARCHAR(20),
  evolution_instance_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'desconectado' CHECK (status IN ('conectado', 'desconectado', 'banido')),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: contatos
```sql
CREATE TABLE contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(150),
  foto_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: conversas
```sql
CREATE TABLE conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES instancias(id),
  contato_id UUID REFERENCES contatos(id),
  agente_id UUID REFERENCES usuarios(id),
  status VARCHAR(20) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'bot', 'em_atendimento', 'encerrada')),
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMP,
  nao_lidas INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: mensagens
```sql
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas(id),
  evolution_message_id VARCHAR(200),
  direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento', 'video', 'sticker')),
  conteudo TEXT,
  midia_url TEXT,
  status_entrega VARCHAR(20) DEFAULT 'enviado' CHECK (status_entrega IN ('enviado', 'entregue', 'lido', 'erro')),
  enviado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: notas_internas
```sql
CREATE TABLE notas_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas(id),
  usuario_id UUID REFERENCES usuarios(id),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: leads (CRM)
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id UUID REFERENCES contatos(id),
  conversa_id UUID REFERENCES conversas(id),
  agente_id UUID REFERENCES usuarios(id),
  estagio VARCHAR(30) DEFAULT 'novo' CHECK (estagio IN ('novo', 'em_contato', 'proposta', 'fechado', 'perdido')),
  valor_estimado NUMERIC(12,2),
  empresa VARCHAR(150),
  anotacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

### Tabela: configuracoes_bot
```sql
CREATE TABLE configuracoes_bot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES instancias(id),
  ativo BOOLEAN DEFAULT true,
  mensagem_boas_vindas TEXT NOT NULL,
  opcoes JSONB NOT NULL,
  mensagem_fora_horario TEXT,
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}',
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Exemplo de opcoes JSONB:
```json
[
  { "numero": "1", "texto": "Localizar veículo", "acao": "atribuir_agente" },
  { "numero": "2", "texto": "Planos e preços", "acao": "atribuir_agente" },
  { "numero": "3", "texto": "Suporte técnico", "acao": "atribuir_agente" }
]
```

### Tabela: webhooks_externos
```sql
CREATE TABLE webhooks_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100),
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

---

## ESTRUTURA DE PASTAS DO PROJETO

```
emee-z/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js                  # Entry point Fastify
│   │   ├── database/
│   │   │   ├── connection.js         # Pool PostgreSQL
│   │   │   └── migrations/           # Arquivos SQL de migração
│   │   ├── routes/
│   │   │   ├── auth.js               # Login, logout, token
│   │   │   ├── conversas.js          # CRUD conversas
│   │   │   ├── mensagens.js          # Envio e listagem
│   │   │   ├── agentes.js            # Gestão de agentes
│   │   │   ├── leads.js              # CRM leads
│   │   │   ├── instancias.js         # Gestão instâncias Evolution
│   │   │   ├── bot.js                # Configuração do bot
│   │   │   ├── webhooks.js           # Recebe eventos Evolution API
│   │   │   └── relatorios.js         # Dados de conversão e métricas
│   │   ├── services/
│   │   │   ├── evolutionService.js   # Integração Evolution API
│   │   │   ├── botService.js         # Lógica do bot de menu
│   │   │   ├── filaService.js        # BullMQ — fila de mensagens
│   │   │   ├── socketService.js      # Emissão Socket.io
│   │   │   └── webhookService.js     # Disparo webhooks externos (CRM)
│   │   └── middleware/
│   │       ├── auth.js               # Verificação JWT
│   │       └── permissoes.js         # Gestora vs Agente
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Inbox.jsx             # Página principal agente
        │   ├── GestoraDashboard.jsx  # Painel gestora
        │   ├── CRM.jsx               # Funil kanban
        │   ├── Relatorios.jsx        # Métricas e conversões
        │   └── Configuracoes.jsx     # Bot, agentes, instâncias
        ├── components/
        │   ├── ListaConversas.jsx
        │   ├── JanelaChat.jsx
        │   ├── InfoContato.jsx
        │   ├── NotasInternas.jsx
        │   ├── TransferirModal.jsx
        │   ├── KanbanBoard.jsx
        │   ├── MetricCard.jsx
        │   └── StatusAgente.jsx
        ├── hooks/
        │   ├── useSocket.js
        │   ├── useConversas.js
        │   └── useAuth.js
        └── services/
            └── api.js                # Axios — chamadas ao backend
```

---

## DOCKER COMPOSE

```yaml
version: '3.8'
services:

  evolution:
    image: atendai/evolution-api:latest
    container_name: emee-z-evolution
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_ENABLED=true
      - REDIS_URI=redis://redis:6379
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=http://backend:3000/webhooks/evolution
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    container_name: emee-z-postgres
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: emee-z-redis
    restart: always
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    container_name: emee-z-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - EVOLUTION_URL=http://evolution:8080
      - EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    depends_on:
      - postgres
      - redis
      - evolution

  frontend:
    build: ./frontend
    container_name: emee-z-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

---

## VARIÁVEIS DE AMBIENTE (.env)

```env
POSTGRES_USER=emeez
POSTGRES_PASSWORD=senha_segura_aqui
POSTGRES_DB=emeez_db
EVOLUTION_API_KEY=chave_evolution_aqui
JWT_SECRET=chave_jwt_muito_longa_e_segura_aqui
```

---

## ENDPOINTS DA API BACKEND

### Autenticação
```
POST   /auth/login              → { email, senha } → { token, usuario }
POST   /auth/logout             → invalida token
GET    /auth/me                 → dados do usuário logado
```

### Conversas
```
GET    /conversas               → lista (filtro: status, agente_id)
GET    /conversas/:id           → detalhes + mensagens
PATCH  /conversas/:id/atribuir  → { agente_id }
PATCH  /conversas/:id/transferir → { agente_id }
PATCH  /conversas/:id/encerrar  → muda status para encerrada
GET    /conversas/:id/notas     → lista notas internas
POST   /conversas/:id/notas     → { conteudo }
```

### Mensagens
```
POST   /mensagens/enviar        → { conversa_id, tipo, conteudo }
GET    /mensagens/:conversa_id  → histórico paginado
```

### Agentes
```
GET    /agentes                 → lista todos (gestora only)
POST   /agentes                 → criar agente { nome, email, senha }
PATCH  /agentes/:id             → editar
DELETE /agentes/:id             → desativar
```

### Leads (CRM)
```
GET    /leads                   → lista com filtros
POST   /leads                   → criar lead
PATCH  /leads/:id               → atualizar estágio, anotações, valor
DELETE /leads/:id               → remover
GET    /leads/:id/historico     → conversas do contato
```

### Instâncias
```
GET    /instancias              → lista
POST   /instancias              → criar instância na Evolution API
GET    /instancias/:id/qrcode   → QR Code para conectar
GET    /instancias/:id/status   → status conexão
DELETE /instancias/:id          → desconectar e remover
```

### Bot
```
GET    /bot/:instancia_id       → configuração atual
PUT    /bot/:instancia_id       → salvar configuração
POST   /bot/:instancia_id/teste → testar mensagem de boas-vindas
```

### Webhooks externos
```
GET    /webhooks                → lista webhooks configurados
POST   /webhooks                → adicionar destino (ex: CRM JuriAlvo)
DELETE /webhooks/:id            → remover
```

### Relatórios
```
GET    /relatorios/resumo       → conversas hoje, semana, mês
GET    /relatorios/agentes      → conversas e conversões por agente
GET    /relatorios/funil        → dados do kanban CRM
GET    /relatorios/conversoes   → taxa de conversão por período
```

### Webhook receptor (Evolution API)
```
POST   /webhooks/evolution      → recebe eventos da Evolution API
```

---

## LÓGICA DO WEBHOOK DA EVOLUTION API

Quando a Evolution API dispara um evento para `POST /webhooks/evolution`, o backend deve:

```
1. Identificar o tipo do evento:
   - MESSAGES_UPSERT     → nova mensagem recebida
   - MESSAGES_UPDATE     → status de entrega atualizado
   - CONNECTION_UPDATE   → status da instância mudou

2. Para MESSAGES_UPSERT (mensagem nova):
   a. Extrair: telefone do remetente, conteúdo, tipo de mídia, instance_id
   b. Buscar ou criar contato pelo telefone
   c. Buscar conversa aberta desse contato
   d. Se NÃO existe conversa aberta:
      → Criar conversa com status 'bot'
      → Chamar botService.enviarMenuBoasVindas(conversa)
   e. Se existe conversa com status 'bot':
      → Verificar se a mensagem é uma opção válida do menu (1, 2, 3...)
      → Se sim: mudar status para 'aguardando', registrar escolha
      → Se não: reenviar menu
   f. Se existe conversa 'aguardando' ou 'em_atendimento':
      → Salvar mensagem no banco
      → Emitir via Socket.io para o agente responsável
      → Incrementar nao_lidas se agente não está visualizando
   g. Disparar webhooks externos configurados (evento: mensagem_recebida)

3. Para MESSAGES_UPDATE:
   → Atualizar status_entrega da mensagem (entregue, lido)
   → Emitir via Socket.io para atualizar ticks no frontend

4. Para CONNECTION_UPDATE:
   → Atualizar status da instância no banco
   → Emitir via Socket.io para atualizar indicador no painel
```

---

## LÓGICA DO BOT DE MENU

```javascript
// botService.js
async function enviarMenuBoasVindas(conversa, configuracao) {
  const linhasOpcoes = configuracao.opcoes
    .map(op => `${op.numero}. ${op.texto}`)
    .join('\n');
  
  const mensagem = `${configuracao.mensagem_boas_vindas}\n\n${linhasOpcoes}`;
  
  await evolutionService.enviarTexto(conversa.instancia_id, conversa.contato.telefone, mensagem);
}

async function processarRespostaBot(conversa, mensagemRecebida, configuracao) {
  const escolha = mensagemRecebida.conteudo.trim();
  const opcao = configuracao.opcoes.find(op => op.numero === escolha);
  
  if (!opcao) {
    await evolutionService.enviarTexto(
      conversa.instancia_id,
      conversa.contato.telefone,
      'Opção inválida. Por favor, escolha um número do menu.'
    );
    return;
  }
  
  // Atualizar status da conversa
  await db.query(
    "UPDATE conversas SET status = 'aguardando' WHERE id = $1",
    [conversa.id]
  );
  
  // Emitir para painel da gestora e agentes disponíveis
  socketService.emitirNovaConversa(conversa);
}
```

---

## EVENTOS SOCKET.IO

O backend emite estes eventos em tempo real para o frontend:

```javascript
// Namespace: /
socket.emit('nova_mensagem',       { conversa_id, mensagem })
socket.emit('conversa_atualizada', { conversa_id, status, agente_id })
socket.emit('nova_conversa',       { conversa })        // aguardando na fila
socket.emit('mensagem_lida',       { mensagem_id })
socket.emit('agente_status',       { agente_id, online: true/false })
socket.emit('instancia_status',    { instancia_id, status })
```

O frontend escuta esses eventos e atualiza o estado React sem precisar fazer polling.

---

## TELAS DO FRONTEND — ESPECIFICAÇÃO DETALHADA

### 1. Login
- Logo Emee-z centralizado
- Campos: email, senha
- Botão entrar
- Sem cadastro público (apenas gestora cria contas)
- Redireciona para Inbox (agente) ou Dashboard (gestora) baseado no papel

### 2. Inbox (agente e gestora)
Layout em 3 colunas:

**Coluna esquerda — Lista de conversas (320px)**
- Barra de busca por nome/telefone
- Abas: Minhas | Fila | Todas (gestora vê as 3, agente só vê Minhas)
- Cada item: foto + nome + preview da última mensagem + horário + badge de não lidas
- Indicador de status: aguardando (amarelo), em atendimento (verde), encerrada (cinza)
- Click abre a conversa na coluna do meio

**Coluna central — Janela de chat (flex)**
- Cabeçalho: nome do contato, número, botões Transferir / Encerrar / Ver Lead
- Histórico de mensagens com scroll
- Mensagens enviadas (direita, fundo azul claro) e recebidas (esquerda, fundo cinza)
- Indicador de tipo de mídia (áudio player inline, imagem clicável, documento com download)
- Campo de texto + botão enviar + botão anexar (imagem/documento)
- Nota interna: botão para adicionar nota (aparece com fundo amarelo na timeline, não vai para o WhatsApp)

**Coluna direita — Info do contato (280px)**
- Foto, nome, telefone, empresa
- Status no CRM (estágio do lead)
- Campo de anotação rápida
- Histórico de conversas anteriores do mesmo contato
- Botão "Abrir no CRM"

### 3. Dashboard da Gestora
- Cards de métricas: conversas hoje / em atendimento agora / na fila / encerradas hoje
- Tabela de agentes: nome, status online, conversas ativas, conversas hoje
- Últimas conversas de todos os agentes (feed em tempo real)
- Gráfico simples de volume de conversas por hora (últimas 24h)

### 4. CRM — Funil Kanban
- 5 colunas: Novo Lead | Em Contato | Proposta | Fechado | Perdido
- Cards arrastáveis entre colunas (drag and drop)
- Cada card: nome do contato, empresa, agente responsável, valor estimado
- Click no card abre modal com: histórico completo, anotações, botão abrir conversa
- Filtros: por agente, por período, por instância
- Contador de cards por coluna

### 5. Relatórios
- Período selecionável: hoje / semana / mês / personalizado
- Taxa de conversão geral
- Conversões por agente (tabela + gráfico de barras)
- Funil de conversão: leads → em contato → proposta → fechado (%)
- Volume de mensagens por dia (gráfico de linha)
- Tempo médio de resposta por agente

### 6. Configurações
**Aba Agentes**
- Lista de agentes com status ativo/inativo
- Formulário criar agente: nome, email, senha temporária, papel

**Aba Instâncias WhatsApp**
- Lista de números conectados com status
- Botão adicionar instância: abre modal com QR Code para escanear
- Status de conexão em tempo real

**Aba Bot**
- Toggle ativo/inativo
- Campo mensagem de boas-vindas
- Editor de opções do menu (adicionar, editar, remover opções)
- Configuração de horário de atendimento
- Mensagem fora do horário
- Botão testar (envia simulação)

**Aba Integrações**
- Lista de webhooks externos configurados
- Formulário: nome, URL destino, eventos a escutar
- Eventos disponíveis: mensagem_recebida, lead_atualizado, conversa_encerrada

---

## DESIGN SYSTEM

- Fonte: Inter (Google Fonts)
- Cores primárias: #0F172A (fundo), #1E293B (sidebar), #FFFFFF (cards)
- Accent: #6366F1 (indigo) para botões e destaques
- Status colors: #22C55E verde, #F59E0B amarelo, #EF4444 vermelho, #94A3B8 cinza
- Tailwind CSS com tema customizado
- Mobile responsive (mas foco em desktop)
- Modo claro apenas no MVP

---

## ORDEM DE CONSTRUÇÃO — PASSO A PASSO

### FASE 1 — Infraestrutura base
1. Criar estrutura de pastas do projeto
2. Criar docker-compose.yml com todos os serviços
3. Criar arquivo .env com variáveis
4. Criar migrations SQL (todas as tabelas)
5. Testar: `docker-compose up` — todos os serviços sobem sem erro

### FASE 2 — Backend base
6. Inicializar projeto Node.js no /backend
7. Instalar dependências: fastify, pg, redis, bullmq, socket.io, jsonwebtoken, bcrypt, axios
8. Criar conexão com PostgreSQL e executar migrations
9. Implementar rota POST /auth/login com JWT
10. Implementar middleware de autenticação
11. Testar login via curl/Insomnia

### FASE 3 — Integração Evolution API
12. Criar evolutionService.js com funções: criarInstancia, obterQRCode, enviarTexto, enviarMidia
13. Implementar rotas /instancias (criar, listar, status, qrcode)
14. Implementar POST /webhooks/evolution (receptor de eventos)
15. Testar: criar instância, gerar QR, escanear com celular de teste, receber mensagem

### FASE 4 — Fluxo de mensagens
16. Implementar lógica completa do webhook: criar contato, criar conversa, salvar mensagem
17. Implementar botService.js (enviar menu, processar resposta)
18. Implementar configuracoes_bot no banco e rota PUT /bot/:instancia_id
19. Implementar Socket.io: emitir eventos em tempo real
20. Implementar rota POST /mensagens/enviar (agente responde)
21. Testar fluxo completo: mensagem chega → bot responde → agente atende → resposta enviada

### FASE 5 — Gestão de conversas
22. Implementar rotas completas /conversas (listar, atribuir, transferir, encerrar)
23. Implementar rotas /conversas/:id/notas
24. Implementar filtros: por status, por agente, por instância
25. Implementar lógica de permissões: agente vê só as suas, gestora vê todas

### FASE 6 — CRM
26. Implementar rotas /leads (CRUD completo)
27. Lógica: quando conversa muda de status, atualizar lead automaticamente
28. Implementar rota /relatorios/* (resumo, agentes, funil, conversões)

### FASE 7 — Frontend
29. Inicializar projeto React + Vite + Tailwind no /frontend
30. Instalar: axios, socket.io-client, react-router-dom, @dnd-kit/core (drag and drop kanban)
31. Criar serviço api.js com interceptor de token JWT
32. Criar hook useSocket.js
33. Construir página Login.jsx
34. Construir Inbox.jsx (3 colunas com socket em tempo real)
35. Construir GestoraDashboard.jsx
36. Construir CRM.jsx com kanban drag and drop
37. Construir Relatorios.jsx com gráficos (usar Recharts)
38. Construir Configuracoes.jsx (todas as abas)

### FASE 8 — Produção
39. Criar Dockerfile para backend
40. Criar Dockerfile para frontend (nginx)
41. Configurar nginx como reverse proxy
42. Testar build completo no Docker
43. Deploy no Oracle Cloud via docker-compose

---

## WEBHOOKS EXTERNOS — INTEGRAÇÃO COM CRM JURIALVO

Quando o Emee-z precisar se comunicar com um CRM externo, ele dispara POST para a URL configurada com este payload:

```json
// Evento: mensagem_recebida
{
  "evento": "mensagem_recebida",
  "timestamp": "2025-04-13T10:30:00Z",
  "contato": {
    "telefone": "5531999999999",
    "nome": "João Costa"
  },
  "conversa_id": "uuid",
  "mensagem": "Olá, quero saber sobre o plano"
}

// Evento: lead_atualizado
{
  "evento": "lead_atualizado",
  "timestamp": "2025-04-13T10:35:00Z",
  "lead_id": "uuid",
  "contato_telefone": "5531999999999",
  "estagio_anterior": "em_contato",
  "estagio_novo": "proposta",
  "agente": "Alessandra"
}

// Evento: conversa_encerrada
{
  "evento": "conversa_encerrada",
  "timestamp": "2025-04-13T10:40:00Z",
  "conversa_id": "uuid",
  "contato_telefone": "5531999999999",
  "duracao_minutos": 12,
  "agente": "Alessandra"
}
```

---

## REGRAS DE NEGÓCIO IMPORTANTES

1. **Uma conversa por contato ativa**: um contato só pode ter uma conversa com status aguardando ou em_atendimento por vez. Novas mensagens de um contato com conversa ativa vão para a mesma conversa.

2. **Bot só age no primeiro contato**: se a conversa já foi atribuída a um agente, o bot não interfere mais.

3. **Transferência preserva histórico**: ao transferir, o novo agente vê todas as mensagens anteriores.

4. **Notas internas são privadas**: nunca aparecem no WhatsApp do contato.

5. **Agente só vê suas conversas**: no inbox pessoal, o agente vê apenas conversas atribuídas a ele. A aba "Fila" mostra conversas aguardando sem agente.

6. **Gestora tem acesso total**: a gestora pode ver, atribuir, transferir e encerrar qualquer conversa.

7. **Mensagens fora do horário**: se o bot está ativo e a mensagem chegou fora do horário configurado, responde com a mensagem de fora do horário e não abre conversa.

8. **Suporte a múltiplas instâncias**: o sistema pode ter N instâncias (números) rodando simultaneamente. Cada conversa pertence a uma instância.

---

## CHECKLIST FINAL ANTES DE CONSIDERAR MVP COMPLETO

- [ ] Login funciona com token JWT
- [ ] QR Code gerado e número conectado sem celular
- [ ] Mensagem recebida aparece no inbox em tempo real (Socket.io)
- [ ] Bot envia menu automaticamente no primeiro contato
- [ ] Agente consegue responder pelo painel
- [ ] Gestora vê todas as conversas
- [ ] Transferência entre agentes funciona
- [ ] CRM kanban funciona com drag and drop
- [ ] Anotações internas salvas e visíveis
- [ ] Relatório de conversões carrega dados corretos
- [ ] QR Code de nova instância funciona
- [ ] Webhook externo disparado ao receber mensagem
- [ ] Sistema roda 100% via Docker sem configuração manual

---

*Emee-z — Plano de Execução v1.0*
*Projeto JuriAlvo — Uso interno + produto SaaS futuro*
