const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

export default async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM instancias ORDER BY nome');
      return res.status(200).json({ instancias: rows });
    }

    if (req.method === 'POST') {
      const { nome, evolution_instance_id } = req.body;
      if (auth.usuario.papel !== 'gestora') return res.status(403).json({ erro: 'Apenas gestoras' });

      const { rows } = await query('INSERT INTO instancias (nome, evolution_instance_id) VALUES ($1, $2) RETURNING *', [nome, evolution_instance_id]);
      return res.status(201).json({ instancia: rows[0] });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro instancias:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
