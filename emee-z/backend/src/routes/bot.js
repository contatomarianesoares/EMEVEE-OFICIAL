const { query } = require('../database/connection')
const { autenticarHook, autenticarGestora } = require('../middleware/auth')
// apenasGestora incorporada em autenticarGestora
const botService = require('../services/botService')

async function botRoutes(fastify) {
  fastify.addHook('preHandler', autenticarHook)

  // GET /bot/:instancia_id — retorna configuração atual
  fastify.get('/bot/:instancia_id', async (request, reply) => {
    const config = await botService.obterConfig(request.params.instancia_id)
    if (!config) {
      // Retorna configuração padrão se não existir ainda
      return reply.send({
        config: {
          instancia_id: request.params.instancia_id,
          ativo: false,
          mensagem_boas_vindas: '',
          opcoes: [],
          mensagem_fora_horario: '',
          horario_inicio: '08:00',
          horario_fim: '18:00',
          dias_semana: [1, 2, 3, 4, 5],
        },
      })
    }
    return reply.send({ config })
  })

  // PUT /bot/:instancia_id — salva ou atualiza configuração (gestora only)
  fastify.put('/bot/:instancia_id', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        required: ['mensagem_boas_vindas', 'opcoes'],
        properties: {
          ativo: { type: 'boolean' },
          mensagem_boas_vindas: { type: 'string', minLength: 1 },
          opcoes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['numero', 'texto', 'acao'],
              properties: {
                numero: { type: 'string' },
                texto: { type: 'string' },
                acao: { type: 'string' },
              },
            },
          },
          mensagem_fora_horario: { type: 'string' },
          horario_inicio: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          horario_fim: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          dias_semana: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
        },
      },
    },
  }, async (request, reply) => {
    const instanciaId = request.params.instancia_id
    const {
      ativo = true,
      mensagem_boas_vindas,
      opcoes,
      mensagem_fora_horario = null,
      horario_inicio = '08:00',
      horario_fim = '18:00',
      dias_semana = [1, 2, 3, 4, 5],
    } = request.body

    // Valida que a instância existe
    const { rows: inst } = await query(
      'SELECT id FROM instancias WHERE id = $1',
      [instanciaId]
    )
    if (!inst.length) {
      return reply.code(404).send({ erro: 'Instância não encontrada' })
    }

    const { rows } = await query(
      `INSERT INTO configuracoes_bot
         (instancia_id, ativo, mensagem_boas_vindas, opcoes, mensagem_fora_horario, horario_inicio, horario_fim, dias_semana)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (instancia_id) DO UPDATE SET
         ativo = EXCLUDED.ativo,
         mensagem_boas_vindas = EXCLUDED.mensagem_boas_vindas,
         opcoes = EXCLUDED.opcoes,
         mensagem_fora_horario = EXCLUDED.mensagem_fora_horario,
         horario_inicio = EXCLUDED.horario_inicio,
         horario_fim = EXCLUDED.horario_fim,
         dias_semana = EXCLUDED.dias_semana
       RETURNING *`,
      [instanciaId, ativo, mensagem_boas_vindas, JSON.stringify(opcoes),
        mensagem_fora_horario, horario_inicio, horario_fim, dias_semana]
    )

    return reply.send({ config: rows[0] })
  })

  // POST /bot/:instancia_id/teste — simula envio do menu (gestora only)
  fastify.post('/bot/:instancia_id/teste', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        required: ['telefone'],
        properties: {
          telefone: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const { instancia_id } = request.params
    const { telefone } = request.body

    // Busca a instância para pegar o nome Evolution
    const { rows: inst } = await query(
      'SELECT evolution_instance_id FROM instancias WHERE id = $1',
      [instancia_id]
    )
    if (!inst.length) {
      return reply.code(404).send({ erro: 'Instância não encontrada' })
    }

    const config = await botService.obterConfig(instancia_id)
    if (!config) {
      return reply.code(400).send({ erro: 'Bot não configurado para esta instância' })
    }

    const menuTexto = botService.montarMenuTexto(config)

    try {
      await require('../services/evolutionService').enviarTexto(
        inst[0].evolution_instance_id,
        telefone,
        menuTexto
      )
      return reply.send({ mensagem: 'Menu enviado com sucesso', texto: menuTexto })
    } catch (err) {
      return reply.code(502).send({ erro: `Falha ao enviar: ${err.message}` })
    }
  })
}

module.exports = botRoutes
