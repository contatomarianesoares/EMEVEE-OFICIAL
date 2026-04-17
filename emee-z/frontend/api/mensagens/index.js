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

    const { conversa_id } = req.query;
    const { rows: conv } = await query('SELECT id, agente_id FROM conversas WHERE id = $1', [conversa_id]);
    if (!conv.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
    if (!await podAcessarConversa(conv[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

    const { rows } = await query('SELECT * FROM mensagens WHERE conversa_id = $1 ORDER BY criado_em ASC', [conversa_id]);
    return res.status(200).json({ mensagens: rows });
  } catch (err) {
    console.error('[API] Erro mensagens:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
