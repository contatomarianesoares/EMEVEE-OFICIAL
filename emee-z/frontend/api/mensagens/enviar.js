const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');
const { v4: uuidv4 } = require('uuid');

async function podAcessarConversa(conversa, usuario) {
  if (usuario.papel === 'gestora') return true;
  return conversa.agente_id === usuario.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { conversa_id, conteudo, tipo = 'texto' } = req.body;
    if (!conversa_id || !conteudo) return res.status(400).json({ erro: 'Campos obrigatórios' });

    const { rows: conv } = await query('SELECT id, agente_id FROM conversas WHERE id = $1', [conversa_id]);
    if (!conv.length) return res.status(404).json({ erro: 'Conversa não encontrada' });
    if (!await podAcessarConversa(conv[0], auth.usuario)) return res.status(403).json({ erro: 'Sem permissão' });

    const { rows } = await query('INSERT INTO mensagens (id, conversa_id, usuario_id, conteudo, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [uuidv4(), conversa_id, auth.usuario.id, conteudo, tipo, 'enviada']);

    // Atualizar ultima_mensagem da conversa
    await query('UPDATE conversas SET ultima_mensagem = $1, ultima_mensagem_em = NOW() WHERE id = $2', [conteudo, conversa_id]);

    return res.status(201).json({ mensagem: rows[0] });
  } catch (err) {
    console.error('[API] Erro enviar mensagem:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
