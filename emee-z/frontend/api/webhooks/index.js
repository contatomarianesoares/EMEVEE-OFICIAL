const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

export default async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM webhooks ORDER BY criado_em DESC');
      return res.status(200).json({ webhooks: rows });
    }

    if (req.method === 'POST') {
      if (auth.usuario.papel !== 'gestora') return res.status(403).json({ erro: 'Apenas gestoras' });
      const { url, eventos } = req.body;
      const { rows } = await query('INSERT INTO webhooks (url, eventos, ativo) VALUES ($1, $2, $3) RETURNING *', [url, eventos, true]);
      return res.status(201).json({ webhook: rows[0] });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro webhooks:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
