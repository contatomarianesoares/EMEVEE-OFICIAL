const { query } = require('../../lib/db');
const { autenticar } = require('../../lib/middleware');
const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });

    const { id } = req.query; // Pego o ID dinâmico do caminho [id]

    // 1. Busca instância no banco
    const { rows: instancias } = await query('SELECT * FROM instancias WHERE id = $1', [id]);
    if (!instancias.length) return res.status(404).json({ erro: 'Instância não encontrada' });
    const instancia = instancias[0];

    // 2. Chama a Evolution API para conectar/obter QR
    const http = axios.create({
      baseURL: EVOLUTION_URL,
      headers: { apikey: EVOLUTION_KEY }
    });

    try {
      // Tenta obter o estado de conexão primeiro
      const { data: statusData } = await http.get(`/instance/connectionState/${instancia.evolution_instance_id}`);
      if (statusData?.instance?.state === 'open') {
        return res.status(200).json({ ja_conectado: true });
      }

      // Se não estiver conectado, pede o QR Code
      const { data: connectData } = await http.get(`/instance/connect/${instancia.evolution_instance_id}`);
      
      // Alguns ambientes Evolution retornam o QR direto (v1.8.x)
      if (connectData?.base64 || connectData?.code) {
        return res.status(200).json({ qrcode: connectData });
      }

      // Outros ambientes (v2.x) apenas iniciam a geração e o QR virá via Webhook
      // Retornamos o que tivermos no banco no momento (pode ser null)
      return res.status(200).json({ 
        qrcode: instancia.ultimo_qr_code, 
        aguardando: !instancia.ultimo_qr_code 
      });

    } catch (err) {
      console.warn('[API QRCODE] Aviso Evolution:', err.message);
      return res.status(200).json({ 
        qrcode: instancia.ultimo_qr_code, 
        aguardando: true 
      });
    }

  } catch (err) {
    console.error('[API QRCODE] Erro interno:', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
