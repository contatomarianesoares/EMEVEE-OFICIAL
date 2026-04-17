const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });

    const { rows } = await query('SELECT id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({ erro: 'Email ou senha inválidos' });

    const usuario = rows[0];
    if (!usuario.ativo) return res.status(403).json({ erro: 'Usuário desativado' });
    if (!await bcrypt.compare(senha, usuario.senha_hash)) return res.status(401).json({ erro: 'Email ou senha inválidos' });

    const token = jwt.sign({ id: usuario.id, email: usuario.email, papel: usuario.papel, nome: usuario.nome }, JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel } });
  } catch (err) {
    console.error('[API] Erro login:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
};
