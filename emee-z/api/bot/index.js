const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (auth.usuario.papel !== 'gestora') return res.status(403).json({ erro: 'Apenas gestoras' });

    const { instancia_id } = req.query;

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM bot_config WHERE instancia_id = $1', [instancia_id]);
      return res.status(200).json({ config: rows[0] || null });
    }

    if (req.method === 'PUT') {
      const { ativo, respostas_padrao } = req.body;
      const { rows } = await query('INSERT INTO bot_config (instancia_id, ativo, respostas_padrao) VALUES ($1, $2, $3) ON CONFLICT (instancia_id) DO UPDATE SET ativo = $2, respostas_padrao = $3, atualizado_em = NOW() RETURNING *', [instancia_id, ativo, JSON.stringify(respostas_padrao)]);
      return res.status(200).json({ config: rows[0] });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro bot:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
