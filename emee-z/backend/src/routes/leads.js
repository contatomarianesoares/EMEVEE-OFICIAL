const { query } = require('../database/connection')
const { autenticarHook } = require('../middleware/auth')
const socketService = require('../services/socketService')
const axios = require('axios')

async function leadsRoutes(fastify) {
  fastify.addHook('preHandler', autenticarHook)

  // GET /leads — lista com filtros
  fastify.get('/leads', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          estagio: { type: 'string' },
          agente_id: { type: 'string' },
          instancia_id: { type: 'string' },
          busca: { type: 'string' },
          data_inicio: { type: 'string' },
          data_fim: { type: 'string' },
          pagina: { type: 'integer', minimum: 1, default: 1 },
          limite: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { estagio, agente_id, busca, data_inicio, data_fim, pagina = 1, limite = 50 } = request.query
    const offset = (pagina - 1) * limite
    const usuario = request.usuario

    const condicoes = []
    const params = []

    // Agente só vê seus próprios leads
    if (usuario.papel === 'agente') {
      condicoes.push(`l.agente_id = $${params.push(usuario.id)}`)
    }

    if (estagio) condicoes.push(`l.estagio = $${params.push(estagio)}`)
    if (agente_id) condicoes.push(`l.agente_id = $${params.push(agente_id)}`)
    if (busca) {
      condicoes.push(`(co.nome ILIKE $${params.push(`%${busca}%`)} OR l.empresa ILIKE $${params.push(`%${busca}%`)})`)
    }
    if (data_inicio) condicoes.push(`l.criado_em >= $${params.push(data_inicio)}`)
    if (data_fim) condicoes.push(`l.criado_em <= $${params.push(data_fim + ' 23:59:59')}`)

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT
         l.*,
         co.nome as contato_nome, co.telefone as contato_telefone, co.foto_url,
         u.nome as agente_nome,
         c.status as conversa_status, c.ultima_mensagem
       FROM leads l
       JOIN contatos co ON co.id = l.contato_id
       LEFT JOIN usuarios u ON u.id = l.agente_id
       LEFT JOIN conversas c ON c.id = l.conversa_id
       ${where}
       ORDER BY
         CASE l.estagio
           WHEN 'novo' THEN 1 WHEN 'em_contato' THEN 2
           WHEN 'proposta' THEN 3 WHEN 'fechado' THEN 4 ELSE 5
         END,
         l.atualizado_em DESC
       LIMIT $${params.push(limite)} OFFSET $${params.push(offset)}`,
      params
    )

    const { rows: total } = await query(
      `SELECT COUNT(*)::int as total FROM leads l JOIN contatos co ON co.id = l.contato_id ${where}`,
      params.slice(0, params.length - 2)
    )

    return reply.send({ leads: rows, paginacao: { pagina, limite, total: total[0].total } })
  })

  // POST /leads — criar lead
  fastify.post('/leads', {
    schema: {
      body: {
        type: 'object',
        required: ['contato_id'],
        properties: {
          contato_id: { type: 'string', format: 'uuid' },
          conversa_id: { type: 'string', format: 'uuid' },
          agente_id: { type: 'string', format: 'uuid' },
          estagio: { type: 'string', enum: ['novo', 'em_contato', 'proposta', 'fechado', 'perdido'] },
          valor_estimado: { type: 'number', minimum: 0 },
          empresa: { type: 'string' },
          anotacoes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const {
      contato_id, conversa_id = null, agente_id = null,
      estagio = 'novo', valor_estimado = null, empresa = null, anotacoes = null,
    } = request.body

    // Agente só pode criar leads para si
    const responsavelId = request.usuario.papel === 'agente'
      ? request.usuario.id
      : (agente_id || request.usuario.id)

    const { rows } = await query(
      `INSERT INTO leads (contato_id, conversa_id, agente_id, estagio, valor_estimado, empresa, anotacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [contato_id, conversa_id, responsavelId, estagio, valor_estimado, empresa, anotacoes]
    )

    return reply.code(201).send({ lead: rows[0] })
  })

  // PATCH /leads/:id — atualizar estágio, valor, anotações
  fastify.patch('/leads/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          estagio: { type: 'string', enum: ['novo', 'em_contato', 'proposta', 'fechado', 'perdido'] },
          valor_estimado: { type: 'number', minimum: 0 },
          empresa: { type: 'string' },
          anotacoes: { type: 'string' },
          agente_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { rows: atual } = await query(
      'SELECT * FROM leads WHERE id = $1',
      [request.params.id]
    )
    if (!atual.length) return reply.code(404).send({ erro: 'Lead não encontrado' })

    // Agente só pode editar seus próprios leads
    if (request.usuario.papel === 'agente' && atual[0].agente_id !== request.usuario.id) {
      return reply.code(403).send({ erro: 'Sem permissão para editar este lead' })
    }

    const estagioAnterior = atual[0].estagio
    const { estagio, valor_estimado, empresa, anotacoes, agente_id } = request.body

    const { rows } = await query(
      `UPDATE leads SET
         estagio = COALESCE($1, estagio),
         valor_estimado = COALESCE($2, valor_estimado),
         empresa = COALESCE($3, empresa),
         anotacoes = COALESCE($4, anotacoes),
         agente_id = COALESCE($5, agente_id),
         atualizado_em = NOW()
       WHERE id = $6
       RETURNING *`,
      [estagio, valor_estimado, empresa, anotacoes, agente_id, request.params.id]
    )

    // Dispara webhook externo se o estágio mudou
    if (estagio && estagio !== estagioAnterior) {
      setImmediate(() => dispararWebhookLeadAtualizado({
        lead_id: rows[0].id,
        contato_id: rows[0].contato_id,
        estagio_anterior: estagioAnterior,
        estagio_novo: estagio,
        agente_id: rows[0].agente_id,
      }))
    }

    return reply.send({ lead: rows[0] })
  })

  // DELETE /leads/:id
  fastify.delete('/leads/:id', async (request, reply) => {
    if (request.usuario.papel !== 'gestora') {
      return reply.code(403).send({ erro: 'Apenas a gestora pode remover leads' })
    }
    const { rowCount } = await query('DELETE FROM leads WHERE id = $1', [request.params.id])
    if (!rowCount) return reply.code(404).send({ erro: 'Lead não encontrado' })
    return reply.send({ mensagem: 'Lead removido' })
  })

  // GET /leads/:id/historico — conversas do contato deste lead
  fastify.get('/leads/:id/historico', async (request, reply) => {
    const { rows: lead } = await query(
      'SELECT contato_id FROM leads WHERE id = $1',
      [request.params.id]
    )
    if (!lead.length) return reply.code(404).send({ erro: 'Lead não encontrado' })

    const { rows } = await query(
      `SELECT
         c.id, c.status, c.ultima_mensagem, c.ultima_mensagem_em, c.criado_em,
         u.nome as agente_nome,
         i.nome as instancia_nome
       FROM conversas c
       LEFT JOIN usuarios u ON u.id = c.agente_id
       LEFT JOIN instancias i ON i.id = c.instancia_id
       WHERE c.contato_id = $1
       ORDER BY c.criado_em DESC`,
      [lead[0].contato_id]
    )

    return reply.send({ historico: rows })
  })
}

async function dispararWebhookLeadAtualizado(dados) {
  try {
    const { query } = require('../database/connection')
    const { rows: whs } = await query(
      "SELECT url FROM webhooks_externos WHERE ativo = true AND 'lead_atualizado' = ANY(eventos)"
    )
    if (!whs.length) return

    const { rows: contato } = await query(
      'SELECT telefone FROM contatos WHERE id = $1',
      [dados.contato_id]
    )
    const { rows: agente } = dados.agente_id
      ? await query('SELECT nome FROM usuarios WHERE id = $1', [dados.agente_id])
      : { rows: [{ nome: 'Sistema' }] }

    const payload = {
      evento: 'lead_atualizado',
      timestamp: new Date().toISOString(),
      lead_id: dados.lead_id,
      contato_telefone: contato[0]?.telefone,
      estagio_anterior: dados.estagio_anterior,
      estagio_novo: dados.estagio_novo,
      agente: agente[0]?.nome,
    }

    await Promise.allSettled(
      whs.map((wh) => axios.post(wh.url, payload, { timeout: 5000 }).catch(() => {}))
    )
  } catch (err) {
    console.error('[Lead] Erro no webhook:', err.message)
  }
}

module.exports = leadsRoutes
