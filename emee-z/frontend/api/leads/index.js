const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');
const { v4: uuidv4 } = require('uuid');

export default async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM leads ORDER BY criado_em DESC');
      return res.status(200).json({ leads: rows });
    }

    if (req.method === 'POST') {
      const { nome, email, telefone, origem } = req.body;
      const { rows } = await query('INSERT INTO leads (id, nome, email, telefone, origem) VALUES ($1, $2, $3, $4, $5) RETURNING *', [uuidv4(), nome, email, telefone, origem]);
      return res.status(201).json({ lead: rows[0] });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro leads:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
