require('dotenv').config()

const Fastify = require('fastify')
const { Server } = require('socket.io')
const { conectar, query } = require('./database/connection')
const socketService = require('./services/socketService')

const PORT = process.env.PORT || 3000
const HOST = '0.0.0.0'

// ── Instância Fastify ────────────────────────────────────────
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

// ── Plugins ──────────────────────────────────────────────────
app.register(require('@fastify/cors'), {
  origin: true,
  credentials: true,
})

// ── Rotas ────────────────────────────────────────────────────
app.register(require('./routes/auth'))
app.register(require('./routes/instancias'))
app.register(require('./routes/webhooks'))
app.register(require('./routes/bot'))
app.register(require('./routes/mensagens'))
app.register(require('./routes/conversas'))
app.register(require('./routes/agentes'))
app.register(require('./routes/leads'))
app.register(require('./routes/relatorios'))

// Health check
app.get('/health', async () => ({
  status: 'ok',
  servico: 'emee-z-backend',
  timestamp: new Date().toISOString(),
}))

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ erro: `Rota não encontrada: ${request.method} ${request.url}` })
})

// Error handler global
app.setErrorHandler((err, request, reply) => {
  app.log.error(err)
  if (err.validation) {
    return reply.code(400).send({ erro: 'Dados inválidos', detalhes: err.validation })
  }
  reply.code(err.statusCode || 500).send({
    erro: err.message || 'Erro interno do servidor',
  })
})

// ── Socket.io ─────────────────────────────────────────────────
function iniciarSocketIo(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  })

  // Inicializa o serviço centralizado de socket
  socketService.init(io)

  // Expõe no fastify para rotas de webhook acessarem
  app.io = io

  io.on('connection', (socket) => {
    app.log.info(`[Socket.io] Cliente conectado: ${socket.id}`)

    socket.on('entrar_sala', (sala) => {
      socket.join(sala)
    })

    socket.on('marcar_lidas', async ({ conversa_id }) => {
      await query('UPDATE conversas SET nao_lidas = 0 WHERE id = $1', [conversa_id])
    })

    socket.on('disconnect', () => {
      app.log.info(`[Socket.io] Cliente desconectado: ${socket.id}`)
    })
  })

  return io
}

// ── Inicialização ────────────────────────────────────────────
async function iniciar() {
  try {
    await conectar()
    await app.listen({ port: PORT, host: HOST })
    iniciarSocketIo(app.server)

    console.log(`\n╔══════════════════════════════════════╗`)
    console.log(`║  EMEE-Z Backend rodando              ║`)
    console.log(`║  http://${HOST}:${PORT}                   ║`)
    console.log(`╚══════════════════════════════════════╝\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

iniciar()

module.exports = { app }
