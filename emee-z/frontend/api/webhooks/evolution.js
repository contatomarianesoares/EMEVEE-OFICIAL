const { query } = require('../lib/db');
const { v4: uuidv4 } = require('uuid');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const payload = req.body;
    const { event, instance, data } = payload;

    // Evento de conexão atualizada
    if (event === 'connection.update' && data) {
      const status = data.state === 'open' ? 'conectado' : 'desconectado';
      await query('UPDATE instancias SET status = $1 WHERE evolution_instance_id = $2', [status, instance]);
    }

    // Evento de QR Code atualizado
    if (event === 'qrcode.updated' && data?.qrcode) {
      await query('UPDATE instancias SET ultimo_qr_code = $1 WHERE evolution_instance_id = $2', [data.qrcode, instance]);
    }

    // Evento de mensagem recebida
    if (event === 'messages.upsert' && data?.messages) {
      for (const msg of data.messages) {
        const { key, message, messageTimestamp } = msg;
        if (!message?.conversation) continue;

        // Procura conversa ou cria nova
        const telefone = key.remoteJid.split('@')[0];
        const { rows: contatos } = await query('SELECT id FROM contatos WHERE telefone = $1', [telefone]);
        let contato_id = contatos[0]?.id;

        if (!contato_id) {
          contato_id = uuidv4();
          await query('INSERT INTO contatos (id, telefone, nome) VALUES ($1, $2, $3)', [contato_id, telefone, `Contato ${telefone.slice(-4)}`]);
        }

        const { rows: conversas } = await query('SELECT id FROM conversas WHERE contato_id = $1 ORDER BY criado_em DESC LIMIT 1', [contato_id]);
        let conversa_id = conversas[0]?.id;

        if (!conversa_id) {
          conversa_id = uuidv4();
          const { rows: instancias } = await query('SELECT id FROM instancias WHERE evolution_instance_id = $1 LIMIT 1', [instance]);
          await query('INSERT INTO conversas (id, contato_id, instancia_id, status, ultima_mensagem, ultima_mensagem_em) VALUES ($1, $2, $3, $4, $5, $6)', [conversa_id, contato_id, instancias[0]?.id, 'aguardando', message.conversation, new Date(messageTimestamp * 1000)]);
        }

        // Salva mensagem
        await query('INSERT INTO mensagens (id, conversa_id, conteudo, tipo, direcao, evolution_msg_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING', [uuidv4(), conversa_id, message.conversation, 'texto', 'recebida', key.id]);

        // Atualiza conversa
        await query('UPDATE conversas SET ultima_mensagem = $1, ultima_mensagem_em = $2, nao_lidas = nao_lidas + 1 WHERE id = $3', [message.conversation, new Date(messageTimestamp * 1000), conversa_id]);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Erro Evolution:', err.message);
    return res.status(500).json({ erro: 'Erro ao processar webhook' });
  }
}
