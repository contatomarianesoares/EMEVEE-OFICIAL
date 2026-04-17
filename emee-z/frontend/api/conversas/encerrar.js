const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

async function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true;
  return conversa.agente_id === usuario.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query;
    const { rows: convRows } = await query('SELECT id, agente_id, contato_id, instancia_id, criado_em FROM conversas WHERE id = $1', [id]);

    if (!convRows.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
    if (!await podAcessarConversa(convRows[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

    await query("UPDATE conversas SET status = $1, nao_lidas = 0, atualizado_em = NOW() WHERE id = $2", ['encerrada', id]);

    return res.status(200).json({ mensagem: 'Conversa encerrada com sucesso' });
  } catch (err) {
    console.error('[API] Erro encerrar:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
