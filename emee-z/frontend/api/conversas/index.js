const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const usuario = auth.usuario;
    const { status, agente_id, instancia_id, busca, pagina = 1, limite = 30 } = req.query;
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    const condicoes = [];
    const params = [];

    if (usuario.papel === 'agente') condicoes.push(`c.agente_id = $${params.push(usuario.id)}`);
    if (status && status !== 'todas') condicoes.push(`c.status = $${params.push(status)}`);
    if (agente_id) condicoes.push(`c.agente_id = $${params.push(agente_id)}`);
    if (instancia_id) condicoes.push(`c.instancia_id = $${params.push(instancia_id)}`);
    if (busca) condicoes.push(`(co.nome ILIKE $${params.push(`%${busca}%`)} OR co.telefone LIKE $${params.push(`%${busca}%`)})`);

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const { rows } = await query(`SELECT c.id, c.status, c.ultima_mensagem, c.ultima_mensagem_em, c.nao_lidas, c.criado_em, co.id as contato_id, co.nome as contato_nome, co.telefone as contato_telefone, co.foto_url, u.id as agente_id, u.nome as agente_nome, i.nome as instancia_nome FROM conversas c JOIN contatos co ON co.id = c.contato_id LEFT JOIN usuarios u ON u.id = c.agente_id LEFT JOIN instancias i ON i.id = c.instancia_id ${where} ORDER BY CASE c.status WHEN 'aguardando' THEN 1 WHEN 'em_atendimento' THEN 2 WHEN 'bot' THEN 3 ELSE 4 END, c.ultima_mensagem_em DESC NULLS LAST LIMIT $${params.push(parseInt(limite))} OFFSET $${params.push(offset)}`, params);
    const { rows: totalRows } = await query(`SELECT COUNT(*)::int as total FROM conversas c JOIN contatos co ON co.id = c.contato_id ${where}`, params.slice(0, params.length - 2));

    return res.status(200).json({ conversas: rows, paginacao: { pagina: parseInt(pagina), limite: parseInt(limite), total: totalRows[0]?.total || 0 } });
  } catch (err) {
    console.error('[API] Erro conversas:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
