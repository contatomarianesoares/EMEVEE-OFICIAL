const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (req.method === 'GET') {
      const { rows } = await query('SELECT id, nome, email, papel, ativo FROM usuarios WHERE papel = $1 ORDER BY nome', ['agente']);
      return res.status(200).json({ agentes: rows });
    }

    if (req.method === 'POST') {
      if (auth.usuario.papel !== 'gestora') return res.status(403).json({ erro: 'Apenas gestoras' });
      const { nome, email } = req.body;
      const { rows } = await query('INSERT INTO usuarios (nome, email, papel, ativo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, papel', [nome, email, 'agente', true]);
      return res.status(201).json({ agente: rows[0] });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro agentes:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
