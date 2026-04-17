const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

async function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true;
  return conversa.agente_id === usuario.id;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query;
    const { agente_id } = req.body;

    const { rows: agenteRows } = await query('SELECT id, nome FROM usuarios WHERE id = $1 AND ativo = true', [agente_id]);
    if (!agenteRows.length) return res.status(404).json({ erro: 'Agente não encontrado ou inativo' });

    const { rows: convRows } = await query('SELECT id, agente_id FROM conversas WHERE id = $1', [id]);
    if (!convRows.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
    if (!await podAcessarConversa(convRows[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

    const { rows } = await query('UPDATE conversas SET agente_id = $1, status = $2, atualizado_em = NOW() WHERE id = $3 RETURNING id, status, agente_id', [agente_id, 'em_atendimento', id]);

    return res.status(200).json({ conversa: rows[0], agente: agenteRows[0] });
  } catch (err) {
    console.error('[API] Erro transferir:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
