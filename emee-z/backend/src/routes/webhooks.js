const { query, transaction } = require('../database/connection')
const { autenticarHook, autenticarGestora } = require('../middleware/auth')
// apenasGestora incorporada em autenticarGestora

async function webhooksRoutes(fastify) {
  // ── Receptor da Evolution API (público — sem JWT) ─────────────
  fastify.post('/webhooks/evolution', async (request, reply) => {
    const payload = request.body

    // A Evolution API pode enviar o evento em diferentes formatos de versão
    const evento = payload.event || payload.type
    const instanceName = payload.instance || payload.instanceName || payload.sender

    fastify.log.info(`[Webhook] Evento: ${evento} | Instância: ${instanceName}`)

    try {
      switch (evento) {
        case 'messages.upsert':
        case 'MESSAGES_UPSERT':
          await processarMensagemRecebida(fastify, payload, instanceName)
          break

        case 'messages.update':
        case 'MESSAGES_UPDATE':
          await processarAtualizacaoEntrega(fastify, payload)
          break

        case 'connection.update':
        case 'CONNECTION_UPDATE':
          await processarAtualizacaoConexao(fastify, payload, instanceName)
          break

        case 'qrcode.updated':
        case 'QRCODE_UPDATED':
          await processarQRCode(fastify, payload, instanceName)
          break

        default:
          fastify.log.info(`[Webhook] Evento ignorado: ${evento}`)
      }
    } catch (err) {
      fastify.log.error(`[Webhook] Erro ao processar ${evento}: ${err.message}`)
    }

    // Sempre responde 200 para a Evolution não retentar
    return reply.code(200).send({ recebido: true })
  })

  // ── Webhooks externos configurados ───────────────────────────

  // GET /webhooks
  fastify.get('/webhooks', {
    preHandler: autenticarGestora,
  }, async (request, reply) => {
    const { rows } = await query(
      'SELECT id, nome, url, eventos, ativo, criado_em FROM webhooks_externos ORDER BY criado_em DESC'
    )
    return reply.send({ webhooks: rows })
  })

  // POST /webhooks
  fastify.post('/webhooks', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        required: ['url', 'eventos'],
        properties: {
          nome: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          eventos: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { nome, url, eventos } = request.body
    const { rows } = await query(
      `INSERT INTO webhooks_externos (nome, url, eventos)
       VALUES ($1, $2, $3)
       RETURNING id, nome, url, eventos, ativo, criado_em`,
      [nome || null, url, eventos]
    )
    return reply.code(201).send({ webhook: rows[0] })
  })

  // DELETE /webhooks/:id
  fastify.delete('/webhooks/:id', {
    preHandler: autenticarGestora,
  }, async (request, reply) => {
    const { rowCount } = await query(
      'DELETE FROM webhooks_externos WHERE id = $1',
      [request.params.id]
    )
    if (!rowCount) return reply.code(404).send({ erro: 'Webhook não encontrado' })
    return reply.send({ mensagem: 'Webhook removido' })
  })
}

// ── Processadores de eventos ──────────────────────────────────

async function processarMensagemRecebida(fastify, payload, instanceName) {
  // Suporte ao formato da Evolution API v2
  const dados = payload.data || payload
  const mensagem = dados.message || dados.messages?.[0]
  if (!mensagem) return

  // Ignorar mensagens enviadas pelo próprio sistema
  if (mensagem.key?.fromMe || dados.key?.fromMe) return

  const telefone = (mensagem.key?.remoteJid || dados.key?.remoteJid || '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')

  if (!telefone || telefone.includes('-')) return // ignora grupos

  const conteudo = extrairConteudo(mensagem)
  const tipo = detectarTipo(mensagem)
  const evolutionMsgId = mensagem.key?.id || dados.key?.id

  // Busca instância no banco
  const { rows: instRows } = await query(
    'SELECT id FROM instancias WHERE evolution_instance_id = $1',
    [instanceName]
  )
  if (!instRows.length) {
    fastify.log.warn(`[Webhook] Instância desconhecida: ${instanceName}`)
    return
  }
  const instanciaId = instRows[0].id

  await transaction(async (client) => {
    // Upsert contato
    const { rows: contRows } = await client.query(
      `INSERT INTO contatos (telefone, nome)
       VALUES ($1, $2)
       ON CONFLICT (telefone) DO UPDATE SET
         nome = COALESCE(EXCLUDED.nome, contatos.nome),
         atualizado_em = NOW()
       RETURNING id`,
      [telefone, dados.pushName || null]
    )
    const contatoId = contRows[0].id

    // Buscar conversa ativa (aguardando, bot ou em_atendimento)
    const { rows: convRows } = await client.query(
      `SELECT id, status, agente_id FROM conversas
       WHERE contato_id = $1 AND instancia_id = $2
         AND status IN ('aguardando', 'bot', 'em_atendimento')
       ORDER BY criado_em DESC LIMIT 1`,
      [contatoId, instanciaId]
    )

    let conversaId
    let statusConversa

    if (!convRows.length) {
      // Nova conversa — inicia com bot
      const { rows: novaConv } = await client.query(
        `INSERT INTO conversas (instancia_id, contato_id, status, ultima_mensagem, ultima_mensagem_em, nao_lidas)
         VALUES ($1, $2, 'bot', $3, NOW(), 1)
         RETURNING id, status`,
        [instanciaId, contatoId, conteudo]
      )
      conversaId = novaConv[0].id
      statusConversa = 'bot'
    } else {
      conversaId = convRows[0].id
      statusConversa = convRows[0].status

      // Atualiza resumo da conversa
      await client.query(
        `UPDATE conversas
         SET ultima_mensagem = $1, ultima_mensagem_em = NOW(),
             nao_lidas = nao_lidas + 1, atualizado_em = NOW()
         WHERE id = $2`,
        [conteudo, conversaId]
      )
    }

    // Salva a mensagem
    await client.query(
      `INSERT INTO mensagens (conversa_id, evolution_message_id, direcao, tipo, conteudo)
       VALUES ($1, $2, 'entrada', $3, $4)
       ON CONFLICT DO NOTHING`,
      [conversaId, evolutionMsgId, tipo, conteudo]
    )

    // Emite via Socket.io
    const io = fastify.io
    if (io) {
      const { rows: convCompleta } = await client.query(
        `SELECT c.*, co.nome as contato_nome, co.telefone as contato_telefone
         FROM conversas c JOIN contatos co ON co.id = c.contato_id
         WHERE c.id = $1`,
        [conversaId]
      )
      const conv = convCompleta[0]

      if (statusConversa === 'bot') {
        io.emit('nova_conversa', { conversa: conv })
      } else {
        io.emit('nova_mensagem', {
          conversa_id: conversaId,
          mensagem: { direcao: 'entrada', tipo, conteudo, criado_em: new Date() },
        })
      }
      io.emit('conversa_atualizada', {
        conversa_id: conversaId,
        status: statusConversa,
        agente_id: convRows[0]?.agente_id || null,
      })
    }

    // Processa bot se conversa está no modo bot
    if (statusConversa === 'bot') {
      setImmediate(() => processarBot(fastify, conversaId, contatoId, instanciaId, telefone, conteudo, instanceName))
    }

    // Dispara webhooks externos
    setImmediate(() => dispararWebhooksExternos('mensagem_recebida', {
      contato: { telefone, nome: dados.pushName || telefone },
      conversa_id: conversaId,
      mensagem: conteudo,
    }))
  })
}

async function processarAtualizacaoEntrega(fastify, payload) {
  const updates = payload.data?.updates || payload.updates || []

  for (const upd of updates) {
    const evolutionMsgId = upd.key?.id
    const novoStatus = mapearStatusEntrega(upd.update?.status)
    if (!evolutionMsgId || !novoStatus) continue

    await query(
      'UPDATE mensagens SET status_entrega = $1 WHERE evolution_message_id = $2',
      [novoStatus, evolutionMsgId]
    )

    const io = fastify.io
    if (io) {
      io.emit('mensagem_lida', { mensagem_id: evolutionMsgId, status: novoStatus })
    }
  }
}

async function processarAtualizacaoConexao(fastify, payload, instanceName) {
  const state = payload.data?.state || payload.state
  const mapaStatus = { open: 'conectado', connecting: 'desconectado', close: 'desconectado' }
  const novoStatus = mapaStatus[state] || 'desconectado'

  const { rows } = await query(
    'UPDATE instancias SET status = $1 WHERE evolution_instance_id = $2 RETURNING id',
    [novoStatus, instanceName]
  )

  if (rows.length) {
    const io = fastify.io
    if (io) {
      io.emit('instancia_status', { instancia_id: rows[0].id, status: novoStatus })
    }
  }
}

async function processarBot(fastify, conversaId, contatoId, instanciaId, telefone, conteudo, instanceName) {
  try {
    const { rows: botRows } = await query(
      'SELECT * FROM configuracoes_bot WHERE instancia_id = $1 AND ativo = true',
      [instanciaId]
    )

    const evolution = require('../services/evolutionService')

    if (!botRows.length) {
      // Sem bot configurado — coloca conversa na fila para agente
      await query(
        "UPDATE conversas SET status = 'aguardando' WHERE id = $1",
        [conversaId]
      )
      return
    }

    const config = botRows[0]

    // Verifica horário de atendimento
    const agora = new Date()
    const diaSemana = agora.getDay() // 0=dom, 1=seg...
    const horaAtual = agora.getHours() * 60 + agora.getMinutes()
    const [hIni, mIni] = config.horario_inicio.split(':').map(Number)
    const [hFim, mFim] = config.horario_fim.split(':').map(Number)
    const inicioMin = hIni * 60 + mIni
    const fimMin = hFim * 60 + mFim
    const dentroHorario = config.dias_semana.includes(diaSemana) && horaAtual >= inicioMin && horaAtual < fimMin

    if (!dentroHorario) {
      if (config.mensagem_fora_horario) {
        await evolution.enviarTexto(instanceName, telefone, config.mensagem_fora_horario)
      }
      await query("UPDATE conversas SET status = 'encerrada' WHERE id = $1", [conversaId])
      return
    }

    // Verifica se já mandou boas-vindas (se não há mensagens de saída)
    const { rows: msgsSaida } = await query(
      "SELECT id FROM mensagens WHERE conversa_id = $1 AND direcao = 'saida' LIMIT 1",
      [conversaId]
    )

    if (!msgsSaida.length) {
      // Primeira interação — envia menu
      const linhasOpcoes = config.opcoes.map((op) => `${op.numero}. ${op.texto}`).join('\n')
      const menuTexto = `${config.mensagem_boas_vindas}\n\n${linhasOpcoes}`
      await evolution.enviarTexto(instanceName, telefone, menuTexto)

      await query(
        `INSERT INTO mensagens (conversa_id, direcao, tipo, conteudo, enviado_por)
         VALUES ($1, 'saida', 'texto', $2, NULL)`,
        [conversaId, menuTexto]
      )
      return
    }

    // Já enviou menu — processa resposta
    const escolha = conteudo.trim()
    const opcoes = Array.isArray(config.opcoes) ? config.opcoes : JSON.parse(config.opcoes)
    const opcao = opcoes.find((op) => op.numero === escolha)

    if (!opcao) {
      await evolution.enviarTexto(
        instanceName,
        telefone,
        'Opção inválida. Por favor, escolha um número do menu.'
      )
      return
    }

    // Opção válida — move para fila de atendimento
    await query(
      "UPDATE conversas SET status = 'aguardando', atualizado_em = NOW() WHERE id = $1",
      [conversaId]
    )

    const io = fastify.io
    if (io) {
      io.emit('conversa_atualizada', { conversa_id: conversaId, status: 'aguardando' })
    }
  } catch (err) {
    console.error('[Bot] Erro ao processar bot:', err.message)
  }
}

async function processarQRCode(fastify, payload, instanceName) {
  // Evolution v2.2.x envia QR via webhook qrcode.updated
  // Estrutura: payload.data.qrcode = { base64, code } OU payload.data = { base64, code }
  const qrData = payload.data?.qrcode || payload.data || {}
  const base64 = qrData.base64 || qrData.qrBase64 || null
  const code   = qrData.code   || qrData.qrCode   || null

  fastify.log.info({ 
    msg: '[Audit QR] Payload Recebido', 
    instanceName, 
    hasBase64: !!base64, 
    base64Sample: base64 ? base64.substring(0, 50) : null 
  })

  if (!base64 && !code) {
    fastify.log.warn(`[QR] Payload sem base64/code para ${instanceName}: ${JSON.stringify(qrData).substring(0, 100)}`)
    return
  }

  // Normaliza base64 (remove prefixo se houver) - O Frontend agora também lida com isso
  let cleanBase64 = base64
  if (cleanBase64 && typeof cleanBase64 === 'string' && cleanBase64.includes(';base64,')) {
    cleanBase64 = cleanBase64.split(';base64,').pop()
  }

  fastify.log.info(`[QR] Emitindo QR Code processado para: ${instanceName}`)

  // Armazena no cache do evolutionService
  const evolution = require('../services/evolutionService')
  evolution.salvarQR(instanceName, { base64: cleanBase64, code })

  // Emite via Socket.io para o frontend atualizar o modal em tempo real
  const io = fastify.io
  if (io) {
    io.emit('qrcode_atualizado', {
      instance_name: instanceName,
      qrcode: { base64: cleanBase64, code },
    })
  }
}

async function dispararWebhooksExternos(evento, dados) {
  try {
    const { rows } = await query(
      'SELECT url FROM webhooks_externos WHERE ativo = true AND $1 = ANY(eventos)',
      [evento]
    )
    if (!rows.length) return

    const axios = require('axios')
    const payload = { evento, timestamp: new Date().toISOString(), ...dados }

    await Promise.allSettled(
      rows.map((wh) =>
        axios.post(wh.url, payload, { timeout: 5000 }).catch((err) =>
          console.warn(`[Webhook Externo] Falha ao notificar ${wh.url}: ${err.message}`)
        )
      )
    )
  } catch (err) {
    console.error('[Webhook Externo] Erro:', err.message)
  }
}

// ── Helpers ───────────────────────────────────────────────────

function extrairConteudo(msg) {
  const m = msg.message || msg
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.fileName ||
    m?.audioMessage && '[Áudio]' ||
    m?.stickerMessage && '[Sticker]' ||
    '[Mensagem]'
  )
}

function detectarTipo(msg) {
  const m = msg.message || msg
  if (m?.imageMessage) return 'imagem'
  if (m?.audioMessage || m?.pttMessage) return 'audio'
  if (m?.videoMessage) return 'video'
  if (m?.documentMessage) return 'documento'
  if (m?.stickerMessage) return 'sticker'
  return 'texto'
}

function mapearStatusEntrega(status) {
  const mapa = {
    DELIVERY_ACK: 'entregue',
    READ: 'lido',
    PLAYED: 'lido',
    ERROR: 'erro',
  }
  return mapa[status] || null
}

module.exports = webhooksRoutes
