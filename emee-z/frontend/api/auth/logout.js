const { autenticar } = require('../lib/middleware');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });
    return res.status(200).json({ mensagem: 'Logout realizado com sucesso' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
