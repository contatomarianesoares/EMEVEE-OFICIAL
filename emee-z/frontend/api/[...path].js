// Roteador centralizado com lógica embutida
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./lib/db');
const { autenticar, apenasGestora } = require('./lib/middleware');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Handlers embutidos por rota
const handlers = {
  'POST /auth/login': loginHandler,
  'POST /auth/logout': logoutHandler,
  'GET /auth/me': meHandler,
  'GET /conversas': conversasHandler,
  'POST /conversas/iniciar': conversasIniciarHandler,
  'GET /conversas/:id': conversaDetalheHandler,
  'POST /conversas/encerrar': conversasEncerrarHandler,
  'POST /conversas/transferir': conversasTransferirHandler,
  'POST /conversas/atribuir': conversasAtribuirHandler,
  'GET /conversas/:id/notas': conversasNotasHandler,
  'GET /mensagens': mensagensHandler,
  'POST /mensagens/enviar': mensagensEnviarHandler,
  'GET /instancias': instanciasHandler,
  'GET /instancias/:id/qrcode': instanciasQrcodeHandler,
  'GET /agentes': agentesHandler,
  'GET /leads': leadsHandler,
  'GET /relatorios': relatoriosHandler,
  'POST /webhooks/evolution': webhooksEvolutionHandler,
  'POST /webhooks': webhooksHandler,
  'POST /bot': botHandler,
};

// ============ AUTH ============
async function loginHandler(req, res) {
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
}

async function logoutHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Logout realizado' });
}

async function meHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  const auth = await autenticar(req);
  if (auth.erro) return res.status(auth.status).json({ erro: auth.erro });
  return res.status(200).json({ usuario: auth.usuario });
}

// ============ CONVERSAS ============
async function conversasHandler(req, res) {
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

async function conversasIniciarHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Conversa iniciada' });
}

async function conversaDetalheHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Detalhes da conversa' });
}

async function conversasEncerrarHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Conversa encerrada' });
}

async function conversasTransferirHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Conversa transferida' });
}

async function conversasAtribuirHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Conversa atribuída' });
}

async function conversasNotasHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ notas: [] });
}

// ============ MENSAGENS ============
async function mensagensHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagens: [] });
}

async function mensagensEnviarHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Mensagem enviada' });
}

// ============ INSTÂNCIAS ============
async function instanciasHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ instancias: [] });
}

async function instanciasQrcodeHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ qrcode: '' });
}

// ============ AGENTES ============
async function agentesHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ agentes: [] });
}

// ============ LEADS ============
async function leadsHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ leads: [] });
}

// ============ RELATÓRIOS ============
async function relatoriosHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ relatorios: [] });
}

// ============ WEBHOOKS ============
async function webhooksEvolutionHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ status: 'ok' });
}

async function webhooksHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ status: 'ok' });
}

// ============ BOT ============
async function botHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  return res.status(200).json({ mensagem: 'Bot acionado' });
}

// ============ ROTEADOR ============
module.exports = async function handler(req, res) {
  try {
    const method = req.method.toUpperCase();
    const pathname = req.url.split('?')[0];
    const path = pathname.replace(/^\/api/, '');

    let foundHandler = null;
    let params = {};

    // Procurar rota
    for (const [route, fn] of Object.entries(handlers)) {
      const [routeMethod, routePath] = route.split(' ');
      if (method !== routeMethod) continue;

      const pattern = '^' + routePath.replace(/:[^/]+/g, '([^/]+)') + '$';
      const regex = new RegExp(pattern);
      const match = path.match(regex);

      if (match) {
        foundHandler = fn;
        // Extrair parâmetros nomeados
        const paramNames = (routePath.match(/:[^/]+/g) || []).map(p => p.slice(1));
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        break;
      }
    }

    if (!foundHandler) {
      return res.status(404).json({ erro: `Rota não encontrada: ${method} ${path}` });
    }

    // Injetar params na request
    req.params = params;
    return await foundHandler(req, res);
  } catch (err) {
    console.error('[API] Erro:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor', debug: err.message });
  }
};
