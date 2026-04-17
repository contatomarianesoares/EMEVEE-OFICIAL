const { query } = require('../database/connection')
const { autenticarHook } = require('../middleware/auth')
const { podAcessarConversa } = require('../middleware/permissoes')
const socketService = require('../services/socketService')

async function conversasRoutes(fastify) {
  fastify.addHook('preHandler', autenticarHook)

  // GET /conversas — lista com filtros
  fastify.get('/conversas', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['aguardando', 'bot', 'em_atendimento', 'encerrada', 'todas'] },
          agente_id: { type: 'string' },
          instancia_id: { type: 'string' },
          busca: { type: 'string' },
          pagina: { type: 'integer', minimum: 1, default: 1 },
          limite: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
        },
      },
    },
  }, async (request, reply) => {
    const { status, agente_id, instancia_id, busca, pagina = 1, limite = 30 } = request.query
    const offset = (pagina - 1) * limite
    const usuario = request.usuario

    const condicoes = []
    const params = []

    // Agente só vê as próprias conversas (onde ele está atribuído)
    if (usuario.papel === 'agente') {
      condicoes.push(`c.agente_id = $${params.push(usuario.id)}`)
    }

    if (status && status !== 'todas') {
      condicoes.push(`c.status = $${params.push(status)}`)
    }

    if (agente_id) {
      condicoes.push(`c.agente_id = $${params.push(agente_id)}`)
    }

    if (instancia_id) {
      condicoes.push(`c.instancia_id = $${params.push(instancia_id)}`)
    }

    if (busca) {
      condicoes.push(`(co.nome ILIKE $${params.push(`%${busca}%`)} OR co.telefone LIKE $${params.push(`%${busca}%`)})`)
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT
         c.id, c.status, c.ultima_mensagem, c.ultima_mensagem_em, c.nao_lidas, c.criado_em,
         co.id as contato_id, co.nome as contato_nome, co.telefone as contato_telefone, co.foto_url,
         u.id as agente_id, u.nome as agente_nome,
         i.nome as instancia_nome
       FROM conversas c
       JOIN contatos co ON co.id = c.contato_id
       LEFT JOIN usuarios u ON u.id = c.agente_id
       LEFT JOIN instancias i ON i.id = c.instancia_id
       ${where}
       ORDER BY
         CASE c.status WHEN 'aguardando' THEN 1 WHEN 'em_atendimento' THEN 2 WHEN 'bot' THEN 3 ELSE 4 END,
         c.ultima_mensagem_em DESC NULLS LAST
       LIMIT $${params.push(limite)} OFFSET $${params.push(offset)}`,
      params
    )

    const { rows: totalRows } = await query(
      `SELECT COUNT(*)::int as total FROM conversas c JOIN contatos co ON co.id = c.contato_id ${where}`,
      params.slice(0, params.length - 2)
    )

    return reply.send({
      conversas: rows,
      paginacao: { pagina, limite, total: totalRows[0].total },
    })
  })

  // GET /conversas/:id — detalhes da conversa
  fastify.get('/conversas/:id', async (request, reply) => {
    const { rows } = await query(
      `SELECT
         c.*,
         co.nome as contato_nome, co.telefone as contato_telefone, co.foto_url,
         u.nome as agente_nome,
         i.nome as instancia_nome, i.evolution_instance_id
       FROM conversas c
       JOIN contatos co ON co.id = c.contato_id
       LEFT JOIN usuarios u ON u.id = c.agente_id
       LEFT JOIN instancias i ON i.id = c.instancia_id
       WHERE c.id = $1`,
      [request.params.id]
    )

    if (!rows.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(rows[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    return reply.send({ conversa: rows[0] })
  })

  // PATCH /conversas/:id/atribuir — atribuir agente (gestora only ou agente pega da fila)
  fastify.patch('/conversas/:id/atribuir', {
    schema: {
      body: {
        type: 'object',
        required: ['agente_id'],
        properties: { agente_id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const { agente_id } = request.body
    const usuario = request.usuario

    // Agente só pode atribuir para si mesmo
    if (usuario.papel === 'agente' && agente_id !== usuario.id) {
      return reply.code(403).send({ erro: 'Agente só pode atribuir conversas para si mesmo' })
    }

    const { rows } = await query(
      `UPDATE conversas
       SET agente_id = $1, status = 'em_atendimento', atualizado_em = NOW()
       WHERE id = $2 AND status IN ('aguardando', 'bot')
       RETURNING id, status, agente_id`,
      [agente_id, request.params.id]
    )

    if (!rows.length) {
      return reply.code(400).send({ erro: 'Conversa não encontrada ou já em atendimento' })
    }

    socketService.conversaAtualizada(rows[0].id, 'em_atendimento', agente_id)
    return reply.send({ conversa: rows[0] })
  })

  // PATCH /conversas/:id/transferir — transfere para outro agente
  fastify.patch('/conversas/:id/transferir', {
    schema: {
      body: {
        type: 'object',
        required: ['agente_id'],
        properties: { agente_id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const { agente_id } = request.body

    // Valida que o agente de destino existe e está ativo
    const { rows: agenteRows } = await query(
      'SELECT id, nome FROM usuarios WHERE id = $1 AND ativo = true',
      [agente_id]
    )
    if (!agenteRows.length) {
      return reply.code(404).send({ erro: 'Agente de destino não encontrado ou inativo' })
    }

    const { rows: convRows } = await query(
      'SELECT id, agente_id FROM conversas WHERE id = $1',
      [request.params.id]
    )
    if (!convRows.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(convRows[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const { rows } = await query(
      `UPDATE conversas
       SET agente_id = $1, status = 'em_atendimento', atualizado_em = NOW()
       WHERE id = $2
       RETURNING id, status, agente_id`,
      [agente_id, request.params.id]
    )

    socketService.conversaAtualizada(rows[0].id, 'em_atendimento', agente_id)
    return reply.send({ conversa: rows[0], agente: agenteRows[0] })
  })

  // PATCH /conversas/:id/encerrar
  fastify.patch('/conversas/:id/encerrar', async (request, reply) => {
    const { rows: convRows } = await query(
      'SELECT id, agente_id, contato_id, instancia_id FROM conversas WHERE id = $1',
      [request.params.id]
    )
    if (!convRows.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(convRows[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    await query(
      "UPDATE conversas SET status = 'encerrada', nao_lidas = 0, atualizado_em = NOW() WHERE id = $1",
      [request.params.id]
    )

    socketService.conversaAtualizada(request.params.id, 'encerrada', null)

    // Calcula duração para webhook externo
    const duracaoMin = Math.round(
      (Date.now() - new Date(convRows[0].criado_em).getTime()) / 60000
    )

    // Dispara webhook externo de forma assíncrona
    setImmediate(async () => {
      try {
        const { rows: contato } = await query(
          'SELECT telefone FROM contatos WHERE id = $1',
          [convRows[0].contato_id]
        )
        const { rows: agente } = convRows[0].agente_id
          ? await query('SELECT nome FROM usuarios WHERE id = $1', [convRows[0].agente_id])
          : { rows: [{ nome: 'Sistema' }] }

        await dispararWebhookEncerramento({
          conversa_id: request.params.id,
          contato_telefone: contato[0]?.telefone,
          duracao_minutos: duracaoMin,
          agente: agente[0]?.nome,
        })
      } catch (e) {
        console.error('[Conversa] Erro no webhook de encerramento:', e.message)
      }
    })

    return reply.send({ mensagem: 'Conversa encerrada com sucesso' })
  })

  // GET /conversas/:id/notas
  fastify.get('/conversas/:id/notas', async (request, reply) => {
    const { rows: conv } = await query(
      'SELECT id, agente_id FROM conversas WHERE id = $1',
      [request.params.id]
    )
    if (!conv.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(conv[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const { rows } = await query(
      `SELECT n.*, u.nome as usuario_nome
       FROM notas_internas n
       JOIN usuarios u ON u.id = n.usuario_id
       WHERE n.conversa_id = $1
       ORDER BY n.criado_em ASC`,
      [request.params.id]
    )

    return reply.send({ notas: rows })
  })

  // POST /conversas/:id/notas
  fastify.post('/conversas/:id/notas', {
    schema: {
      body: {
        type: 'object',
        required: ['conteudo'],
        properties: { conteudo: { type: 'string', minLength: 1 } },
      },
    },
  }, async (request, reply) => {
    const { rows: conv } = await query(
      'SELECT id, agente_id FROM conversas WHERE id = $1',
      [request.params.id]
    )
    if (!conv.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(conv[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão' })
    }

    const { rows } = await query(
      `INSERT INTO notas_internas (conversa_id, usuario_id, conteudo)
       VALUES ($1, $2, $3)
       RETURNING id, conversa_id, conteudo, criado_em`,
      [request.params.id, request.usuario.id, request.body.conteudo]
    )

    return reply.code(201).send({ nota: { ...rows[0], usuario_nome: request.usuario.nome } })
  })

  // POST /conversas/iniciar — inicia nova conversa ativa (agente/gestora envia primeiro)
  fastify.post('/conversas/iniciar', {
    schema: {
      body: {
        type: 'object',
        required: ['telefone', 'instancia_id', 'conteudo'],
        properties: {
          telefone: { type: 'string', minLength: 8 },
          instancia_id: { type: 'string', format: 'uuid' },
          conteudo: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { telefone, instancia_id, conteudo } = request.body
    const usuario = request.usuario

    // 1. Normaliza telefone (remove não-dígitos)
    const telLimpo = telefone.replace(/\D/g, '')

    // 2. Busca instância e valida se está conectada
    const { rows: instRows } = await query(
      'SELECT id, nome, evolution_instance_id, status FROM instancias WHERE id = $1',
      [instancia_id]
    )
    if (!instRows.length) return reply.code(404).send({ erro: 'Instância não encontrada' })
    if (instRows[0].status !== 'conectado') {
      return reply.code(400).send({ erro: 'A instância selecionada não está conectada' })
    }

    const { evolution_instance_id } = instRows[0]

    // 3. Processo Transacional: Contato -> Conversa -> Mensagem -> Evolution
    try {
      const resultado = await require('../database/connection').transaction(async (client) => {
        // Upsert Contato
        const { rows: contRows } = await client.query(
          `INSERT INTO contatos (telefone)
           VALUES ($1)
           ON CONFLICT (telefone) DO UPDATE SET atualizado_em = NOW()
           RETURNING id, nome, telefone`,
          [telLimpo]
        )
        const contato = contRows[0]

        // Buscar conversa existente ativa
        const { rows: convExistente } = await client.query(
          `SELECT id FROM conversas
           WHERE contato_id = $1 AND instancia_id = $2
             AND status IN ('aguardando', 'bot', 'em_atendimento')
           LIMIT 1`,
          [contato.id, instancia_id]
        )

        let conversaId
        if (convExistente.length) {
          conversaId = convExistente[0].id
          // Atualiza conversa existente
          await client.query(
            `UPDATE conversas
             SET status = 'em_atendimento', agente_id = $1, ultima_mensagem = $2,
                 ultima_mensagem_em = NOW(), atualizado_em = NOW()
             WHERE id = $3`,
            [usuario.id, conteudo, conversaId]
          )
        } else {
          // Criar Nova Conversa
          const { rows: novaConv } = await client.query(
            `INSERT INTO conversas (instancia_id, contato_id, agente_id, status, ultima_mensagem, ultima_mensagem_em)
             VALUES ($1, $2, $3, 'em_atendimento', $4, NOW())
             RETURNING id`,
            [instancia_id, contato.id, usuario.id, conteudo]
          )
          conversaId = novaConv[0].id
        }

        // 4. Envia via Evolution API
        const evolution = require('../services/evolutionService')
        const evolutionResp = await evolution.enviarTexto(evolution_instance_id, telLimpo, conteudo)
        const evolutionMsgId = evolutionResp?.key?.id || null

        // 5. Salva a Mensagem no Banco
        const { rows: msgRows } = await client.query(
          `INSERT INTO mensagens (conversa_id, evolution_message_id, direcao, tipo, conteudo, enviado_por)
           VALUES ($1, $2, 'saida', 'texto', $3, $4)
           RETURNING *`,
          [conversaId, evolutionMsgId, conteudo, usuario.id]
        )

        return { conversaId, mensagem: msgRows[0], contato }
      })

      // Emite via Socket após sucesso da transação
      socketService.conversaAtualizada(resultado.conversaId, 'em_atendimento', usuario.id)
      socketService.novaMensagem(resultado.conversaId, {
        ...resultado.mensagem,
        enviado_por_nome: usuario.nome
      })

      return reply.code(201).send({
        conversa_id: resultado.conversaId,
        mensagem: resultado.mensagem,
        contato: resultado.contato
      })

    } catch (err) {
      console.error('[Conversa Iniciar] Erro Detalhado:', err);
      const msgErro = err.response?.data?.message || err.message || 'Erro desconhecido';
      return reply.code(500).send({
        erro: `Falha na Evolution API: ${msgErro}`
      })
    }
  })
}

async function dispararWebhookEncerramento(dados) {
  const { rows } = await require('../database/connection').query(
    "SELECT url FROM webhooks_externos WHERE ativo = true AND 'conversa_encerrada' = ANY(eventos)"
  )
  if (!rows.length) return
  const axios = require('axios')
  const payload = { evento: 'conversa_encerrada', timestamp: new Date().toISOString(), ...dados }
  await Promise.allSettled(
    rows.map((wh) => axios.post(wh.url, payload, { timeout: 5000 }).catch(() => {}))
  )
}

module.exports = conversasRoutes
