const { query } = require('../lib/db');
const { autenticar } = require('../lib/middleware');

export default async function handler(req, res) {
  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM instancias ORDER BY nome');
      return res.status(200).json({ instancias: rows });
    }

    if (req.method === 'POST') {
      const { nome } = req.body;
      if (auth.usuario.papel !== 'gestora') return res.status(403).json({ erro: 'Apenas gestoras' });

      const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';
      const evolution_instance_id = `emeez-${nome.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 1000)}`;

      const http = axios.create({
        baseURL: EVOLUTION_URL,
        headers: { apikey: EVOLUTION_KEY }
      });

      // 1. Cria na Evolution
      await http.post('/instance/create', {
        instanceName: evolution_instance_id,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });

      // 2. Configura Webhook (se tivermos a URL do sistema)
      const SYSTEM_URL = process.env.SYSTEM_URL;
      if (SYSTEM_URL) {
        await http.post(`/webhook/set/${evolution_instance_id}`, {
          url: `${SYSTEM_URL}/api/webhooks/evolution`,
          enabled: true,
          webhookByEvents: false,
          base64: true,
          events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
        });
      }

      // 3. Salva no Banco
      const { rows } = await query('INSERT INTO instancias (nome, evolution_instance_id) VALUES ($1, $2) RETURNING *', [nome, evolution_instance_id]);
      const instancia = rows[0];

      // 4. Inicializa Config do Bot
      await query('INSERT INTO configuracoes_bot (instancia_id, mensagem_boas_vindas, opcoes) VALUES ($1, $2, $3)', 
        [instancia.id, 'Olá! Como podemos ajudar?', JSON.stringify([
          { numero: '1', texto: 'Falar com Atendente', acao: 'atribuir_agente' }
        ])]
      );

      return res.status(201).json({ instancia });
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (err) {
    console.error('[API] Erro instancias:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
