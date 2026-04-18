// Roteador centralizado de API
// Consolida 20+ endpoints em 1 serverless function

const fs = require('fs');
const path = require('path');

// Mapear rotas dinâmicas -> handlers
const routes = {
  // Auth
  'POST /auth/login': () => require('./auth/login.js'),
  'POST /auth/logout': () => require('./auth/logout.js'),
  'GET /auth/me': () => require('./auth/me.js'),

  // Conversas
  'GET /conversas': () => require('./conversas/index.js'),
  'POST /conversas/iniciar': () => require('./conversas/iniciar.js'),
  'POST /conversas/encerrar': () => require('./conversas/encerrar.js'),
  'POST /conversas/transferir': () => require('./conversas/transferir.js'),
  'POST /conversas/atribuir': () => require('./conversas/atribuir.js'),
  'GET /conversas/:id': () => require('./conversas/[id].js'),
  'GET /conversas/:id/notas': () => require('./conversas/notas.js'),

  // Mensagens
  'GET /mensagens': () => require('./mensagens/index.js'),
  'POST /mensagens/enviar': () => require('./mensagens/enviar.js'),

  // Instâncias
  'GET /instancias': () => require('./instancias/index.js'),
  'GET /instancias/:id/qrcode': () => require('./instancias/[id]/qrcode.js'),

  // Agentes
  'GET /agentes': () => require('./agentes/index.js'),

  // Leads
  'GET /leads': () => require('./leads/index.js'),

  // Relatórios
  'GET /relatorios': () => require('./relatorios/index.js'),

  // Webhooks
  'POST /webhooks/evolution': () => require('./webhooks/evolution.js'),
  'POST /webhooks': () => require('./webhooks/index.js'),

  // Bot
  'POST /bot': () => require('./bot/index.js'),
};

module.exports = async function handler(req, res) {
  try {
    const method = req.method.toUpperCase();
    const path = req.url.split('?')[0]; // Remove query string
    const normalizedPath = path.replace(/^\\/api/, ''); // Remove /api prefix

    // Procurar rota exata primeiro
    let handler = null;
    let routeKey = null;

    for (const [route, getHandler] of Object.entries(routes)) {
      const [routeMethod, routePath] = route.split(' ');
      if (method !== routeMethod) continue;

      // Match exato
      if (routePath === normalizedPath) {
        handler = getHandler();
        routeKey = route;
        break;
      }

      // Match com parâmetro dinâmico (:id)
      const regexPath = routePath
        .replace(/:[^/]+/g, '[^/]+');
      if (new RegExp(`^${regexPath}$`).test(normalizedPath)) {
        handler = getHandler();
        routeKey = route;
        break;
      }
    }

    if (!handler) {
      return res.status(404).json({ erro: `Rota não encontrada: ${method} ${normalizedPath}` });
    }

    // Chamar handler
    return await handler(req, res);
  } catch (err) {
    console.error('[API Router] Erro:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};
