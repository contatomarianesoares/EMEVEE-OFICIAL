-- ============================================================
-- EMEE-Z — Schema Inicial
-- Migration: 001_schema_inicial.sql
-- ============================================================

-- Habilitar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('gestora', 'agente')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INSTANCIAS (números WhatsApp via Evolution API)
-- ============================================================
CREATE TABLE IF NOT EXISTS instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  numero_whatsapp VARCHAR(20),
  evolution_instance_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'desconectado' CHECK (status IN ('conectado', 'desconectado', 'banido')),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONTATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(150),
  foto_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONVERSAS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES instancias(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,
  agente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'bot', 'em_atendimento', 'encerrada')),
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMP,
  nao_lidas INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);
CREATE INDEX IF NOT EXISTS idx_conversas_agente ON conversas(agente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_contato ON conversas(contato_id);

-- ============================================================
-- MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
  evolution_message_id VARCHAR(200),
  direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento', 'video', 'sticker')),
  conteudo TEXT,
  midia_url TEXT,
  status_entrega VARCHAR(20) DEFAULT 'enviado' CHECK (status_entrega IN ('enviado', 'entregue', 'lido', 'erro')),
  enviado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mensagens_evolution ON mensagens(evolution_message_id) WHERE evolution_message_id IS NOT NULL;

-- ============================================================
-- NOTAS INTERNAS
-- ============================================================
CREATE TABLE IF NOT EXISTS notas_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LEADS (CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,
  conversa_id UUID REFERENCES conversas(id) ON DELETE SET NULL,
  agente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  estagio VARCHAR(30) DEFAULT 'novo' CHECK (estagio IN ('novo', 'em_contato', 'proposta', 'fechado', 'perdido')),
  valor_estimado NUMERIC(12,2),
  empresa VARCHAR(150),
  anotacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_estagio ON leads(estagio);
CREATE INDEX IF NOT EXISTS idx_leads_agente ON leads(agente_id);

-- ============================================================
-- CONFIGURACOES DO BOT
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracoes_bot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES instancias(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  mensagem_boas_vindas TEXT NOT NULL,
  opcoes JSONB NOT NULL DEFAULT '[]',
  mensagem_fora_horario TEXT,
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}',
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(instancia_id)
);

-- ============================================================
-- WEBHOOKS EXTERNOS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100),
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DADOS INICIAIS — usuária gestora padrão
-- Email: contatomarianesoares@gmail.com
-- ============================================================
INSERT INTO usuarios (nome, email, senha_hash, papel)
VALUES (
  'Mariane Soares',
  'contatomarianesoares@gmail.com',
  '$2b$10$o436hlpofMqCXqJchvFvAuglhX5B/UnhLTH69T79aPrTTD.WFgwVe',
  'gestora'
)
ON CONFLICT (email) DO NOTHING;
