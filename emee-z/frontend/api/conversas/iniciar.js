const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');
const { v4: uuidv4 } = require('uuid');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { telefone, instancia_id, conteudo } = req.body;
    if (!telefone || !instancia_id || !conteudo) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });

    const contato_id = uuidv4();
    const conversa_id = uuidv4();

    await query('INSERT INTO contatos (id, telefone, nome) VALUES ($1, $2, $3)', [contato_id, telefone, `Contato ${telefone.slice(-4)}`]);
    const { rows } = await query('INSERT INTO conversas (id, contato_id, instancia_id, agente_id, status, ultima_mensagem, ultima_mensagem_em) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, status', [conversa_id, contato_id, instancia_id, auth.usuario.id, 'em_atendimento', conteudo]);

    return res.status(201).json({ conversa: rows[0] });
  } catch (err) {
    console.error('[API] Erro POST conversas/iniciar:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
