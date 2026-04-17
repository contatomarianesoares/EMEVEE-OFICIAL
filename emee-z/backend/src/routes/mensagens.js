const { query } = require('../database/connection')
const { autenticarHook } = require('../middleware/auth')
const { podAcessarConversa } = require('../middleware/permissoes')
const evolution = require('../services/evolutionService')
const socketService = require('../services/socketService')

async function mensagensRoutes(fastify) {
  fastify.addHook('preHandler', autenticarHook)

  // GET /mensagens/:conversa_id — histórico paginado
  fastify.get('/mensagens/:conversa_id', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          pagina: { type: 'integer', minimum: 1, default: 1 },
          limite: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { conversa_id } = request.params
    const { pagina = 1, limite = 50 } = request.query
    const offset = (pagina - 1) * limite

    // Verifica acesso à conversa
    const { rows: convRows } = await query(
      'SELECT id, agente_id FROM conversas WHERE id = $1',
      [conversa_id]
    )
    if (!convRows.length) return reply.code(404).send({ erro: 'Conversa não encontrada' })
    if (!podAcessarConversa(convRows[0], request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão para acessar esta conversa' })
    }

    const { rows: mensagens } = await query(
      `SELECT m.*, u.nome as enviado_por_nome
       FROM mensagens m
       LEFT JOIN usuarios u ON u.id = m.enviado_por
       WHERE m.conversa_id = $1
       ORDER BY m.criado_em ASC
       LIMIT $2 OFFSET $3`,
      [conversa_id, limite, offset]
    )

    const { rows: total } = await query(
      'SELECT COUNT(*)::int as total FROM mensagens WHERE conversa_id = $1',
      [conversa_id]
    )

    // Zera não lidas ao carregar
    await query('UPDATE conversas SET nao_lidas = 0 WHERE id = $1', [conversa_id])

    return reply.send({
      mensagens,
      paginacao: {
        pagina,
        limite,
        total: total[0].total,
        paginas: Math.ceil(total[0].total / limite),
      },
    })
  })

  // POST /mensagens/enviar — agente envia mensagem
  fastify.post('/mensagens/enviar', {
    schema: {
      body: {
        type: 'object',
        required: ['conversa_id', 'tipo', 'conteudo'],
        properties: {
          conversa_id: { type: 'string', format: 'uuid' },
          tipo: { type: 'string', enum: ['texto', 'imagem', 'audio', 'documento', 'video'] },
          conteudo: { type: 'string', minLength: 1 },
          midia_url: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { conversa_id, tipo, conteudo, midia_url } = request.body

    // Busca conversa com dados necessários
    const { rows: convRows } = await query(
      `SELECT c.*, i.evolution_instance_id, co.telefone as contato_telefone
       FROM conversas c
       JOIN instancias i ON i.id = c.instancia_id
       JOIN contatos co ON co.id = c.contato_id
       WHERE c.id = $1`,
      [conversa_id]
    )

    if (!convRows.length) {
      return reply.code(404).send({ erro: 'Conversa não encontrada' })
    }

    const conversa = convRows[0]

    if (!podAcessarConversa(conversa, request.usuario)) {
      return reply.code(403).send({ erro: 'Sem permissão para esta conversa' })
    }

    if (conversa.status === 'encerrada') {
      return reply.code(400).send({ erro: 'Não é possível enviar mensagem em conversa encerrada' })
    }

    // Envia via Evolution API
    let evolutionResposta
    try {
      if (tipo === 'texto') {
        evolutionResposta = await evolution.enviarTexto(
          conversa.evolution_instance_id,
          conversa.contato_telefone,
          conteudo
        )
      } else {
        evolutionResposta = await evolution.enviarMidia(
          conversa.evolution_instance_id,
          conversa.contato_telefone,
          tipo,
          midia_url || conteudo,
          { legenda: tipo === 'imagem' ? conteudo : undefined, nomeArquivo: tipo === 'documento' ? conteudo : undefined }
        )
      }
    } catch (err) {
      return reply.code(502).send({ erro: `Evolution API: ${err.message}` })
    }

    const evolutionMsgId = evolutionResposta?.key?.id || null

    // Salva no banco
    const { rows: msgRows } = await query(
      `INSERT INTO mensagens (conversa_id, evolution_message_id, direcao, tipo, conteudo, midia_url, enviado_por, status_entrega)
       VALUES ($1, $2, 'saida', $3, $4, $5, $6, 'enviado')
       RETURNING *`,
      [conversa_id, evolutionMsgId, tipo, conteudo, midia_url || null, request.usuario.id]
    )

    const mensagem = msgRows[0]

    // Atualiza conversa — muda para em_atendimento se ainda estava aguardando
    await query(
      `UPDATE conversas
       SET ultima_mensagem = $1,
           ultima_mensagem_em = NOW(),
           atualizado_em = NOW(),
           status = CASE WHEN status = 'aguardando' THEN 'em_atendimento' ELSE status END,
           agente_id = COALESCE(agente_id, $2)
       WHERE id = $3`,
      [conteudo, request.usuario.id, conversa_id]
    )

    // Emite em tempo real
    socketService.novaMensagem(conversa_id, { ...mensagem, enviado_por_nome: request.usuario.nome })
    socketService.conversaAtualizada(conversa_id, 'em_atendimento', request.usuario.id)

    return reply.code(201).send({ mensagem })
  })
}

module.exports = mensagensRoutes
