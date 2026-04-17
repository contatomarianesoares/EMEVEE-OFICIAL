const { autenticar } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });
    return res.status(200).json({ usuario: auth.usuario });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
