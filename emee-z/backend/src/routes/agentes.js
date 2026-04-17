const bcrypt = require('bcryptjs')
const { query } = require('../database/connection')
const { autenticarHook, autenticarGestora } = require('../middleware/auth')
// apenasGestora incorporada em autenticarGestora
const socketService = require('../services/socketService')

async function agentesRoutes(fastify) {
  fastify.addHook('preHandler', autenticarHook)

  // GET /agentes — lista todos os agentes (gestora only)
  fastify.get('/agentes', {
    preHandler: autenticarGestora,
  }, async (request, reply) => {
    const { rows } = await query(
      `SELECT
         u.id, u.nome, u.email, u.papel, u.ativo, u.criado_em,
         COUNT(c.id) FILTER (WHERE c.status = 'em_atendimento')::int AS conversas_ativas,
         COUNT(c.id) FILTER (
           WHERE c.status = 'encerrada'
           AND DATE(c.atualizado_em) = CURRENT_DATE
         )::int AS conversas_hoje
       FROM usuarios u
       LEFT JOIN conversas c ON c.agente_id = u.id
       WHERE u.papel = 'agente'
       GROUP BY u.id
       ORDER BY u.nome ASC`
    )
    return reply.send({ agentes: rows })
  })

  // POST /agentes — criar novo agente (gestora only)
  fastify.post('/agentes', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 },
          papel: { type: 'string', enum: ['agente', 'gestora'], default: 'agente' },
        },
      },
    },
  }, async (request, reply) => {
    const { nome, email, senha, papel = 'agente' } = request.body

    const { rows: existe } = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (existe.length) {
      return reply.code(409).send({ erro: 'Email já cadastrado' })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const { rows } = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, papel, ativo, criado_em`,
      [nome, email.toLowerCase().trim(), senhaHash, papel]
    )

    return reply.code(201).send({ agente: rows[0] })
  })

  // PATCH /agentes/:id — editar agente (gestora only)
  fastify.patch('/agentes/:id', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        properties: {
          nome: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 },
          ativo: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { nome, email, senha, ativo } = request.body

    const { rows: atual } = await query(
      'SELECT id, nome, email, ativo FROM usuarios WHERE id = $1',
      [id]
    )
    if (!atual.length) return reply.code(404).send({ erro: 'Agente não encontrado' })

    const novoNome = nome ?? atual[0].nome
    const novoEmail = email ? email.toLowerCase().trim() : atual[0].email
    const novoAtivo = ativo ?? atual[0].ativo
    const novoHash = senha ? await bcrypt.hash(senha, 10) : null

    const { rows } = await query(
      `UPDATE usuarios
       SET nome = $1,
           email = $2,
           ativo = $3,
           senha_hash = COALESCE($4, senha_hash)
       WHERE id = $5
       RETURNING id, nome, email, papel, ativo, criado_em`,
      [novoNome, novoEmail, novoAtivo, novoHash, id]
    )

    // Emite status para o painel em tempo real
    socketService.agenteStatus(id, novoAtivo)

    return reply.send({ agente: rows[0] })
  })

  // DELETE /agentes/:id — desativar agente (gestora only, não exclui do banco)
  fastify.delete('/agentes/:id', {
    preHandler: autenticarGestora,
  }, async (request, reply) => {
    const { id } = request.params

    // Impede auto-exclusão
    if (id === request.usuario.id) {
      return reply.code(400).send({ erro: 'Você não pode desativar seu próprio usuário' })
    }

    const { rows } = await query(
      "UPDATE usuarios SET ativo = false WHERE id = $1 RETURNING id, nome",
      [id]
    )
    if (!rows.length) return reply.code(404).send({ erro: 'Agente não encontrado' })

    socketService.agenteStatus(id, false)
    return reply.send({ mensagem: `Agente ${rows[0].nome} desativado` })
  })
}

module.exports = agentesRoutes
