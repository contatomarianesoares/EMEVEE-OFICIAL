const bcrypt = require('bcryptjs')
const { query } = require('../database/connection')
const { gerarToken, autenticarHook } = require('../middleware/auth')

async function authRoutes(fastify) {
  // POST /auth/login
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, senha } = request.body

    const { rows } = await query(
      'SELECT id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (!rows.length) {
      return reply.code(401).send({ erro: 'Email ou senha inválidos' })
    }

    const usuario = rows[0]

    if (!usuario.ativo) {
      return reply.code(403).send({ erro: 'Usuário desativado. Contate a gestora.' })
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash)
    if (!senhaCorreta) {
      return reply.code(401).send({ erro: 'Email ou senha inválidos' })
    }

    const token = gerarToken(usuario)

    return reply.send({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
      },
    })
  })

  // GET /auth/me — retorna dados do usuário logado
  fastify.get('/auth/me', {
    preHandler: autenticarHook,
  }, async (request, reply) => {
    return reply.send({ usuario: request.usuario })
  })

  // POST /auth/logout — invalidação é feita no cliente (JWT stateless)
  // Aqui apenas confirmamos a ação e o cliente descarta o token
  fastify.post('/auth/logout', {
    preHandler: autenticarHook,
  }, async (request, reply) => {
    return reply.send({ mensagem: 'Logout realizado com sucesso' })
  })
}

module.exports = authRoutes
