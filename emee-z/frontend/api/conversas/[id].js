const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

async function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true;
  return conversa.agente_id === usuario.id;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query;
    const { rows } = await query(`SELECT c.*, co.nome as contato_nome, co.telefone as contato_telefone, co.foto_url, u.nome as agente_nome, i.nome as instancia_nome, i.evolution_instance_id FROM conversas c JOIN contatos co ON co.id = c.contato_id LEFT JOIN usuarios u ON u.id = c.agente_id LEFT JOIN instancias i ON i.id = c.instancia_id WHERE c.id = $1`, [id]);

    if (!rows.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
    if (!await podAcessarConversa(rows[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

    return res.status(200).json({ conversa: rows[0] });
  } catch (err) {
    console.error('[API] Erro GET conversas/:id:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
