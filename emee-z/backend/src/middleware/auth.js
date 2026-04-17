const jwt = require('jsonwebtoken')
const { query } = require('../database/connection')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_troque_em_producao'

function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      nome: usuario.nome,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

// Hook Fastify — exige token válido em qualquer rota decorada com autenticar: true
async function autenticarHook(request, reply) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ erro: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const payload = verificarToken(token)

    // Verificar se o usuário ainda está ativo no banco
    const { rows } = await query(
      'SELECT id, nome, email, papel, ativo FROM usuarios WHERE id = $1',
      [payload.id]
    )

    if (!rows.length || !rows[0].ativo) {
      return reply.code(401).send({ erro: 'Usuário inativo ou não encontrado' })
    }

    request.usuario = rows[0]
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({ erro: 'Token expirado' })
    }
    return reply.code(401).send({ erro: 'Token inválido' })
  }
}

// Hook combinado: autentica E verifica permissão de gestora em uma única função
// Fastify v4 não aceita array em preHandler inline — use este hook combinado
async function autenticarGestora(request, reply) {
  await autenticarHook(request, reply)
  if (reply.sent) return // auth falhou, resposta já enviada
  const { apenasGestora } = require('./permissoes')
  await apenasGestora(request, reply)
}

module.exports = { gerarToken, verificarToken, autenticarHook, autenticarGestora }
