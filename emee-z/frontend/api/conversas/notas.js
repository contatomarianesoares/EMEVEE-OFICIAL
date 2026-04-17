const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');
const { v4: uuidv4 } = require('uuid');

async function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true;
  return conversa.agente_id === usuario.id;
}

export default async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query;

    if (req.method === 'GET') {
      const { rows: conv } = await query('SELECT id, agente_id FROM conversas WHERE id = $1', [id]);
      if (!conv.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
      if (!await podAcessarConversa(conv[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

      const { rows } = await query('SELECT n.*, u.nome as usuario_nome FROM notas_internas n JOIN usuarios u ON u.id = n.usuario_id WHERE n.conversa_id = $1 ORDER BY n.criado_em ASC', [id]);
      return res.status(200).json({ notas: rows });
    }

    if (req.method === 'POST') {
      const { conteudo } = req.body;
      if (!conteudo) return res.status(400).json({ erro: 'Conteúdo obrigatório' });

      const { rows: conv } = await query('SELECT id, agente_id FROM conversas WHERE id = $1', [id]);
      if (!conv.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
      if (!await podAcessarConversa(conv[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

      const { rows } = await query('INSERT INTO notas_internas (id, conversa_id, usuario_id, conteudo) VALUES ($1, $2, $3, $4) RETURNING id, conversa_id, conteudo, criado_em', [uuidv4(), id, auth.usuario.id, conteudo]);
      return res.status(201).json({ nota: { ...rows[0], usuario_nome: auth.usuario.nome } });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro notas:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
