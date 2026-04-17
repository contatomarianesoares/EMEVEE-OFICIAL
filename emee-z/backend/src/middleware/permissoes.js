// Middleware de permissões — garante acesso baseado no papel do usuário

async function apenasGestora(request, reply) {
  if (!request.usuario) {
    return reply.code(401).send({ erro: 'Não autenticado' })
  }
  if (request.usuario.papel !== 'gestora') {
    return reply.code(403).send({ erro: 'Acesso restrito à gestora' })
  }
}

async function apenasAgente(request, reply) {
  if (!request.usuario) {
    return reply.code(401).send({ erro: 'Não autenticado' })
  }
  if (request.usuario.papel !== 'agente') {
    return reply.code(403).send({ erro: 'Acesso restrito a agentes' })
  }
}

// Gestora pode tudo; agente só acessa recursos próprios (conversa.agente_id === usuario.id)
function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true
  return conversa.agente_id === usuario.id
}

module.exports = { apenasGestora, apenasAgente, podAcessarConversa }
