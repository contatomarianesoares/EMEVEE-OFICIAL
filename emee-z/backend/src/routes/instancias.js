const { query } = require('../database/connection')
const { autenticarHook, autenticarGestora } = require('../middleware/auth')
// apenasGestora incorporada em autenticarGestora
const evolution = require('../services/evolutionService')

async function instanciasRoutes(fastify) {
  // Todas as rotas de instâncias exigem autenticação
  fastify.addHook('preHandler', autenticarHook)

  // GET /instancias — lista todas
  fastify.get('/instancias', async (request, reply) => {
    const { rows } = await query(
      'SELECT id, nome, numero_whatsapp, evolution_instance_id, status, criado_em FROM instancias ORDER BY criado_em DESC'
    )
    return reply.send({ instancias: rows })
  })

  // POST /instancias — cria nova instância (gestora only)
  fastify.post('/instancias', {
    preHandler: autenticarGestora,
    schema: {
      body: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const { nome } = request.body

    // Normaliza o nome para uso como ID na Evolution (sem espaços/especiais)
    const evolutionId = nome
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Verifica duplicata local
    const { rows: existe } = await query(
      'SELECT id FROM instancias WHERE evolution_instance_id = $1',
      [evolutionId]
    )
    if (existe.length) {
      return reply.code(409).send({ erro: 'Já existe uma instância com este nome' })
    }

    // Cria na Evolution API
    let evolutionData
    try {
      evolutionData = await evolution.criarInstancia(evolutionId)
    } catch (err) {
      return reply.code(502).send({ erro: `Evolution API: ${err.message}` })
    }

    // Configura webhook para receber eventos
    const webhookUrl = `${process.env.BACKEND_URL || 'http://backend:3000'}/webhooks/evolution`
    try {
      await evolution.configurarWebhook(evolutionId, webhookUrl)
    } catch (err) {
      console.warn('[Instâncias] Aviso: falha ao configurar webhook:', err.message)
    }

    // Salva no banco
    const { rows } = await query(
      `INSERT INTO instancias (nome, evolution_instance_id, status)
       VALUES ($1, $2, 'desconectado')
       RETURNING id, nome, evolution_instance_id, status, criado_em`,
      [nome, evolutionId]
    )

    return reply.code(201).send({ instancia: rows[0] })
  })

  // GET /instancias/:id/qrcode — retorna QR Code para escanear
  // Evolution v2.2.x: QR vem via webhook; este endpoint dispara reconexão e aguarda
  fastify.get('/instancias/:id/qrcode', async (request, reply) => {
    const { rows } = await query(
      'SELECT id, evolution_instance_id, status FROM instancias WHERE id = $1',
      [request.params.id]
    )
    if (!rows.length) {
      return reply.code(404).send({ erro: 'Instância não encontrada' })
    }

    const instancia = rows[0]

    // Se já está conectado não precisa de QR
    if (instancia.status === 'conectado') {
      return reply.send({ qrcode: null, ja_conectado: true })
    }

    try {
      const qr = await evolution.obterQRCode(instancia.evolution_instance_id)

      if (!qr || (!qr.base64 && !qr.code)) {
        // QR ainda não chegou via webhook — retorna aguardando
        // O frontend deve escutar o evento Socket.io 'qrcode_atualizado'
        return reply.send({ qrcode: null, aguardando: true, mensagem: 'QR Code sendo gerado. Aguarde o evento em tempo real.' })
      }

      return reply.send({ qrcode: qr })
    } catch (err) {
      return reply.code(502).send({ erro: `Evolution API: ${err.message}` })
    }
  })

  // GET /instancias/:id/status — consulta status de conexão
  fastify.get('/instancias/:id/status', async (request, reply) => {
    const { rows } = await query(
      'SELECT id, evolution_instance_id, status FROM instancias WHERE id = $1',
      [request.params.id]
    )
    if (!rows.length) {
      return reply.code(404).send({ erro: 'Instância não encontrada' })
    }

    let statusEvolution
    try {
      statusEvolution = await evolution.obterStatus(rows[0].evolution_instance_id)
    } catch {
      statusEvolution = 'desconectado'
    }

    // Mapeia o estado da Evolution API para nosso modelo
    const mapaStatus = {
      open: 'conectado',
      connecting: 'desconectado',
      close: 'desconectado',
    }
    const statusNovo = mapaStatus[statusEvolution] || 'desconectado'

    // Atualiza no banco se mudou
    if (statusNovo !== rows[0].status) {
      await query('UPDATE instancias SET status = $1 WHERE id = $2', [statusNovo, rows[0].id])
    }

    return reply.send({ id: rows[0].id, status: statusNovo, status_evolution: statusEvolution })
  })

  // POST /instancias/:id/reconfigure-webhook — força a (re)configuração do webhook
  fastify.post('/instancias/:id/reconfigure-webhook', { preHandler: autenticarGestora }, async (request, reply) => {
    const { id } = request.params;
    const { rows } = await query('SELECT evolution_instance_id FROM instancias WHERE id = $1', [id]);
    if (!rows.length) return reply.code(404).send({ erro: 'Instância não encontrada' });
    const evolutionId = rows[0].evolution_instance_id;
    const webhookUrl = `${process.env.BACKEND_URL || 'http://backend:3000'}/webhooks/evolution`;
    try {
      await evolution.configurarWebhook(evolutionId, webhookUrl);
      return reply.send({ mensagem: 'Webhook configurado com sucesso' });
    } catch (err) {
      console.warn('[Instâncias] Falha ao (re)configurar webhook:', err.message);
      return reply.code(502).send({ erro: `Evolution API: ${err.message}` });
    }
  });

  // DELETE /instancias/:id - deleta a instância
  fastify.delete('/instancias/:id', {
    preHandler: autenticarGestora,
  }, async (request, reply) => {
    const { rows } = await query(
      'SELECT id, evolution_instance_id FROM instancias WHERE id = $1',
      [request.params.id]
    )
    if (!rows.length) {
      return reply.code(404).send({ erro: 'Instância não encontrada' })
    }

    try {
      await evolution.deletarInstancia(rows[0].evolution_instance_id)
    } catch (err) {
      console.warn('[Instâncias] Aviso ao deletar na Evolution:', err.message)
    }

    await query('DELETE FROM instancias WHERE id = $1', [request.params.id])

    return reply.send({ mensagem: 'Instância removida com sucesso' })
  })
}

module.exports = instanciasRoutes
