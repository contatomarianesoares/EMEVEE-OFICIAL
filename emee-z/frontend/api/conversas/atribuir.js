const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query;
    const { agente_id } = req.body;

    if (auth.usuario.papel === 'agente' && agente_id !== auth.usuario.id) {
      return res.status(403).json({ erro: 'Agente só pode atribuir para si mesmo' });
    }

    const { rows } = await query('UPDATE conversas SET agente_id = $1, status = $2, atualizado_em = NOW() WHERE id = $3 AND status IN ($4, $5) RETURNING id, status, agente_id', [agente_id, 'em_atendimento', id, 'aguardando', 'bot']);

    if (!rows.length) return res.status(400).json({ erro: 'Conversa não encontrada ou já em atendimento' });

    return res.status(200).json({ conversa: rows[0] });
  } catch (err) {
    console.error('[API] Erro PATCH atribuir:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
