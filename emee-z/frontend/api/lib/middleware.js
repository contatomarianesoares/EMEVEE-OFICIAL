const jwt = require('jsonwebtoken');
const { query } = require('./db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function autenticar(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { erro: 'Token não fornecido', status: 401 };
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await query('SELECT id, nome, email, papel, ativo FROM usuarios WHERE id = $1', [payload.id]);
    if (!rows.length || !rows[0].ativo) return { erro: 'Usuário inativo', status: 401 };
    return { usuario: rows[0] };
  } catch (err) {
    return { erro: err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido', status: 401 };
  }
}

async function apenasGestora(req) {
  const auth = await autenticar(req);
  if (auth.erro) return auth;
  if (auth.usuario.papel !== 'gestora') return { erro: 'Acesso negado', status: 403 };
  return auth;
}

module.exports = { autenticar, apenasGestora };
