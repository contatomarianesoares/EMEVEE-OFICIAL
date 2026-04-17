const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { tipo = 'resumo' } = req.query;

    if (tipo === 'resumo') {
      const { rows: conversas } = await query('SELECT COUNT(*) as total, COUNT(CASE WHEN status = $1 THEN 1 END) as aguardando, COUNT(CASE WHEN status = $2 THEN 1 END) as em_atendimento FROM conversas', ['aguardando', 'em_atendimento']);
      return res.status(200).json({ resumo: conversas[0] });
    }

    if (tipo === 'agentes') {
      const { rows } = await query('SELECT u.id, u.nome, COUNT(c.id) as conversas_atendidas FROM usuarios u LEFT JOIN conversas c ON c.agente_id = u.id WHERE u.papel = $1 GROUP BY u.id, u.nome', ['agente']);
      return res.status(200).json({ agentes: rows });
    }

    return res.status(400).json({ erro: 'Tipo de relatório inválido' });
  } catch (err) {
    console.error('[API] Erro relatorios:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
